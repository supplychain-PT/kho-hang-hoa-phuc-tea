import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Input, Select, Tag, Space, Card, Typography,
  Modal, Form, InputNumber, message, Tooltip, Row, Col, Popconfirm,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeInvisibleOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import { productsService } from '../services/products.service';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/format';
import { exportToExcel } from '../utils/exportExcel';
import { Product, ProductCategory } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const isStoreOwner = user?.role === 'STORE_OWNER';

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const [exporting, setExporting] = useState(false);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: productsService.getCategories,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, categoryId],
    queryFn: () => productsService.getAll({ page, limit: 20, search, categoryId }),
    placeholderData: (prev: any) => prev,
  });

  const createMutation = useMutation({
    mutationFn: productsService.create,
    onSuccess: () => {
      message.success('Tạo sản phẩm thành công');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi tạo sản phẩm'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => productsService.update(id, data),
    onSuccess: () => {
      message.success('Cập nhật thành công');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
      form.resetFields();
      setEditingProduct(null);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi cập nhật'),
  });

  const deleteMutation = useMutation({
    mutationFn: productsService.delete,
    onSuccess: () => {
      message.success('Đã ngừng kinh doanh sản phẩm');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi xóa sản phẩm'),
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.setFieldsValue({
      ...product,
      categoryId: product.categoryId,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await productsService.getAll({ limit: 9999, search, categoryId });
      const rows = res.data.map((p: Product) => ({
        'Mã Hàng': p.code,
        'Tên Hàng': p.name,
        'Nhóm Hàng': (p as any).category?.name || '',
        'ĐVT': p.unit,
        'Giá Bán': p.sellingPrice,
        'Giá Vốn': p.costPrice ?? '',
        'Trạng Thái': p.isActive ? 'Đang KD' : 'Ngừng KD',
      }));
      exportToExcel(rows, `Danh_Sach_San_Pham_${new Date().toISOString().slice(0, 10)}`, 'Sản Phẩm');
    } catch {
      message.error('Lỗi xuất Excel');
    } finally {
      setExporting(false);
    }
  };

  const stockColumn = {
    title: 'Tồn Kho',
    dataIndex: 'stock',
    key: 'stock',
    render: (stock: number, record: Product) => (
      <Space>
        <span style={{ color: stock <= record.minStock ? '#f5222d' : '#52c41a', fontWeight: 600 }}>
          {stock}
        </span>
        <Text type="secondary" style={{ fontSize: 12 }}>{record.unit}</Text>
        {stock <= record.minStock && stock > 0 && (
          <Tag color="orange" style={{ fontSize: 11 }}>Sắp hết</Tag>
        )}
        {stock === 0 && <Tag color="red" style={{ fontSize: 11 }}>Hết hàng</Tag>}
      </Space>
    ),
  };

  const columns = [
    {
      title: 'Mã Hàng',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Text code style={{ fontSize: 12 }}>{code}</Text>,
    },
    {
      title: 'Tên Hàng',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (name: string, record: Product) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 600, height: 'auto' }}
          onClick={() => navigate(`/products/${record.id}`)}
        >
          {name}
        </Button>
      ),
    },
    {
      title: 'Nhóm Hàng',
      dataIndex: ['category', 'name'],
      key: 'category',
      render: (name: string) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: 'ĐVT',
      dataIndex: 'unit',
      key: 'unit',
    },
    ...(!isStoreOwner ? [stockColumn] : []),
    {
      title: 'Giá Bán',
      dataIndex: 'sellingPrice',
      key: 'sellingPrice',
      render: (price: number) => (
        <Text strong style={{ color: '#52c41a' }}>{formatCurrency(price)}</Text>
      ),
    },
    ...(!isStoreOwner ? [{
      title: 'Giá Vốn',
      dataIndex: 'costPrice',
      key: 'costPrice',
      render: (price: number | null) => price !== null ? (
        <Text type="secondary">{formatCurrency(price)}</Text>
      ) : (
        <Tooltip title="Ẩn với chủ cửa hàng">
          <EyeInvisibleOutlined style={{ color: '#ccc' }} />
        </Tooltip>
      ),
    }] : []),
    ...(isAdmin ? [{
      title: 'Thao Tác',
      key: 'actions',
      render: (_: any, record: Product) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Ngừng kinh doanh sản phẩm này?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Xác nhận"
            cancelText="Hủy"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Danh Sách Sản Phẩm</Title>
        <Space>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExport}
            loading={exporting}
            style={{ color: '#52c41a', borderColor: '#52c41a' }}
          >
            Xuất Excel
          </Button>
          {isAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditingProduct(null); form.resetFields(); setModalOpen(true); }}
            >
              Thêm Sản Phẩm
            </Button>
          )}
        </Space>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={10}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm theo mã, tên sản phẩm..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Lọc theo nhóm hàng"
              value={categoryId}
              onChange={(val) => { setCategoryId(val); setPage(1); }}
              allowClear
              style={{ width: '100%' }}
            >
              {categoriesData?.map((cat: ProductCategory) => (
                <Option key={cat.id} value={cat.id}>
                  {cat.name} ({cat._count?.products || 0})
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.meta.total || 0,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} sản phẩm`,
          }}
          size="middle"
        />
      </Card>

      {/* Product Modal */}
      <Modal
        title={editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingProduct(null); form.resetFields(); }}
        footer={null}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="code" label="Mã Hàng" rules={[{ required: true }]}>
                <Input disabled={!!editingProduct} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label="Đơn Vị Tính" rules={[{ required: true }]}>
                <Input placeholder="Cái, Thùng, Gói..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="name" label="Tên Sản Phẩm" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="categoryId" label="Nhóm Hàng" rules={[{ required: true }]}>
            <Select placeholder="Chọn nhóm hàng">
              {categoriesData?.map((cat: ProductCategory) => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sellingPrice" label="Giá Bán (đ)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="costPrice" label="Giá Vốn (đ)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="stock" label="Tồn Kho">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="minStock" label="Tồn Nhỏ Nhất">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingProduct ? 'Cập Nhật' : 'Tạo Mới'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default ProductsPage;
