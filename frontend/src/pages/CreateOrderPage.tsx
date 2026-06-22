import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card, Select, Input, Button, Table, InputNumber, Space, Typography,
  Divider, Empty, message, Row, Col, Tag, Form, AutoComplete,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, DeleteOutlined, ShoppingCartOutlined,
} from '@ant-design/icons';
import { productsService } from '../services/products.service';
import { storesService } from '../services/stores.service';
import { ordersService } from '../services/orders.service';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/format';
import { Product } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

interface CartItem {
  product: Product;
  quantity: number;
}

function CreateOrderPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isStoreOwner = user?.role === 'STORE_OWNER';
  const ownStores = user?.stores || [];

  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    isStoreOwner ? (ownStores[0]?.id || '') : '',
  );
  const [storeSearch, setStoreSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState('');

  // For admin/staff: fetch all stores from API
  const { data: allStoresData } = useQuery({
    queryKey: ['stores-all', storeSearch],
    queryFn: () => storesService.getAll({ limit: 100, search: storeSearch }),
    enabled: !isStoreOwner,
  });

  const categoryColorMap: Record<string, string> = {
    'NL ĐỘC QUYỀN': 'red',
    'VL ĐỘC QUYỀN': 'volcano',
    'NGUYÊN LIỆU': 'orange',
    'VẬT LIỆU': 'gold',
  };

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: productsService.getCategories,
  });

  // Load toàn bộ sản phẩm theo category, filter search client-side
  const { data: productsData } = useQuery({
    queryKey: ['products', 'create-order', categoryId],
    queryFn: () => productsService.getAll({ categoryId, limit: 500 }),
    placeholderData: (prev: any) => prev,
  });

  // Client-side filter: normalize Unicode để tìm "bột" ra "BỘT"
  const normalize = useCallback((s: string) => s.toLowerCase().normalize('NFC'), []);

  const filteredProducts = useMemo(() => {
    const all: Product[] = productsData?.data || [];
    if (!productSearch.trim()) return all;
    const kw = normalize(productSearch.trim());
    return all.filter((p) =>
      normalize(p.name).includes(kw) || normalize(p.code).includes(kw),
    );
  }, [productsData, productSearch, normalize]);

  // Autocomplete options từ client-side filter
  const autoOptions = useMemo(() => {
    if (productSearch.trim().length < 1) return [];
    return filteredProducts.slice(0, 20).map((p: Product) => ({
      value: p.id,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <Tag color={(categoryColorMap as any)[(p as any).category?.name || ''] || 'default'} style={{ fontSize: 10, marginRight: 6 }}>
              {(p as any).category?.name}
            </Tag>
            <Text strong style={{ fontSize: 13 }}>{p.name}</Text>
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>{p.unit}</Text>
          </span>
          <Text strong style={{ color: '#52c41a', fontSize: 13 }}>{formatCurrency(p.sellingPrice)}</Text>
        </div>
      ),
      product: p,
    }));
  }, [filteredProducts, productSearch, categoryColorMap]);

  const createMutation = useMutation({
    mutationFn: ordersService.create,
    onSuccess: (order) => {
      message.success('Tạo đơn hàng thành công!');
      navigate(`/orders/${order.id}`);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi tạo đơn hàng'),
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item)),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0),
    [cart],
  );

  const handleSubmit = () => {
    if (!selectedStoreId) {
      message.error('Vui lòng chọn cửa hàng');
      return;
    }
    if (cart.length === 0) {
      message.error('Vui lòng thêm ít nhất 1 sản phẩm');
      return;
    }
    createMutation.mutate({
      storeId: selectedStoreId,
      note,
      items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
    });
  };

  const productColumns = [
    {
      title: 'Tên Hàng',
      key: 'product',
      render: (_: any, product: Product) => (
        <Text strong style={{ fontSize: 13 }}>{product.name}</Text>
      ),
    },
    {
      title: 'Nhóm',
      key: 'category',
      width: 130,
      render: (_: any, product: Product) => {
        const name = (product as any).category?.name || '';
        return <Tag color={categoryColorMap[name] || 'default'} style={{ fontSize: 11 }}>{name}</Tag>;
      },
    },
    {
      title: 'ĐVT',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
    },
    ...(!isStoreOwner ? [{
      title: 'Tồn Kho',
      dataIndex: 'stock',
      key: 'stock',
      width: 80,
      render: (stock: number, product: Product) => (
        <Text
          strong
          style={{ color: stock === 0 ? '#f5222d' : stock <= product.minStock ? '#fa8c16' : '#333' }}
        >
          {stock}
        </Text>
      ),
    }] : []),
    {
      title: 'Giá Bán',
      dataIndex: 'sellingPrice',
      key: 'sellingPrice',
      render: (price: number) => <Text strong style={{ color: '#52c41a' }}>{formatCurrency(price)}</Text>,
    },
    {
      title: '',
      key: 'add',
      width: 60,
      render: (_: any, product: Product) => (
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => addToCart(product)}
        />
      ),
    },
  ];

  const cartColumns = [
    {
      title: 'Tên Hàng',
      key: 'name',
      render: (_: any, item: CartItem) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{item.product.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{item.product.unit}</Text>
        </div>
      ),
    },
    {
      title: 'Số Lượng',
      key: 'qty',
      width: 90,
      render: (_: any, item: CartItem) => (
        <InputNumber
          min={1}
          value={item.quantity}
          onChange={(val) => updateQuantity(item.product.id, val || 1)}
          style={{ width: 80 }}
          size="small"
        />
      ),
    },
    {
      title: 'Đơn Giá',
      key: 'price',
      width: 110,
      render: (_: any, item: CartItem) => formatCurrency(item.product.sellingPrice),
    },
    {
      title: 'Thành Tiền',
      key: 'total',
      width: 120,
      render: (_: any, item: CartItem) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatCurrency(item.product.sellingPrice * item.quantity)}
        </Text>
      ),
    },
    {
      title: '',
      key: 'del',
      width: 48,
      render: (_: any, item: CartItem) => (
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => removeFromCart(item.product.id)}
        />
      ),
    },
  ];

  // Store selector: STORE_OWNER uses own stores, admin fetches all with search
  const storeSelector = isStoreOwner ? (
    <Select
      value={selectedStoreId}
      onChange={setSelectedStoreId}
      placeholder="Chọn cửa hàng"
      style={{ width: '100%' }}
      size="large"
    >
      {ownStores.map((store) => (
        <Option key={store.id} value={store.id}>
          <strong>{store.code}</strong>
        </Option>
      ))}
    </Select>
  ) : (
    <Select
      showSearch
      value={selectedStoreId || undefined}
      onChange={setSelectedStoreId}
      placeholder="Tìm mã cửa hàng..."
      style={{ width: '100%' }}
      size="large"
      filterOption={false}
      onSearch={setStoreSearch}
      allowClear
      notFoundContent="Không tìm thấy cửa hàng"
    >
      {(allStoresData?.data || []).map((store: any) => (
        <Option key={store.id} value={store.id}>
          <Text code style={{ fontSize: 13 }}>{store.code}</Text>
        </Option>
      ))}
    </Select>
  );

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>Tạo Đơn Hàng Mới</Title>

      {/* Store & Note */}
      <Card style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Cửa Hàng Đặt Hàng" required style={{ marginBottom: 0 }}>
                {storeSelector}
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Ghi Chú" style={{ marginBottom: 0 }}>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú đơn hàng (tùy chọn)"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Product List */}
        <Col xs={24} lg={14}>
          <Card
            title="Danh Sách Sản Phẩm"
            styles={{ body: { padding: 0 } }}
          >
            {/* Toolbar — hiện trực tiếp trên màn hình */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
              <Row gutter={[8, 8]}>
                <Col xs={24} sm={14}>
                  <AutoComplete
                    style={{ width: '100%' }}
                    options={autoOptions}
                    value={productSearch}
                    onChange={setProductSearch}
                    onSelect={(_val: string, option: any) => {
                      addToCart(option.product);
                      setProductSearch('');
                    }}
                    allowClear
                    notFoundContent={productSearch.trim().length >= 1 ? 'Không tìm thấy sản phẩm' : null}
                  >
                    <Input
                      prefix={<SearchOutlined />}
                      placeholder="Tìm theo tên, mã sản phẩm..."
                    />
                  </AutoComplete>
                </Col>
                <Col xs={24} sm={10}>
                  <Select
                    placeholder="Lọc nhóm hàng"
                    value={categoryId}
                    onChange={(val) => { setCategoryId(val); setProductSearch(''); }}
                    allowClear
                    style={{ width: '100%' }}
                    size="middle"
                  >
                    {categoriesData?.map((cat: any) => (
                      <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                    ))}
                  </Select>
                </Col>
              </Row>
            </div>
            <Table
              columns={productColumns}
              dataSource={filteredProducts}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 15, showSizeChanger: false, style: { padding: '8px 16px' } }}
              scroll={{ x: 500 }}
              style={{ padding: 0 }}
            />
          </Card>
        </Col>

        {/* Cart */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <ShoppingCartOutlined />
                <span>Giỏ Hàng ({cart.length} sản phẩm)</span>
              </Space>
            }
            style={{ position: 'sticky', top: 80 }}
          >
            {cart.length === 0 ? (
              <Empty description="Chưa có sản phẩm nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <>
                <Table
                  columns={cartColumns}
                  dataSource={cart}
                  rowKey={(item) => item.product.id}
                  size="small"
                  pagination={false}
                  scroll={{ x: 380 }}
                />
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 16 }}>Tổng Tiền:</Text>
                  <Text strong style={{ fontSize: 20, color: '#52c41a' }}>
                    {formatCurrency(totalAmount)}
                  </Text>
                </div>
                <Button
                  type="primary"
                  block
                  size="large"
                  loading={createMutation.isPending}
                  onClick={handleSubmit}
                  disabled={!selectedStoreId || cart.length === 0}
                  style={{ height: 48, fontSize: 16, fontWeight: 600 }}
                >
                  Tạo Đơn Hàng
                </Button>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default CreateOrderPage;
