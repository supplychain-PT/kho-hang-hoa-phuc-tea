import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tabs, Button, Typography, Tag, Table, Space, Popconfirm,
  message, Spin, Modal, Form, Input, InputNumber, Select,
} from 'antd';
import {
  EditOutlined, DeleteOutlined, ArrowLeftOutlined,
  AppstoreOutlined, HistoryOutlined, InboxOutlined,
} from '@ant-design/icons';
import { productsService } from '../services/products.service';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDateTime } from '../utils/format';
import { Product, ProductCategory } from '../types';

const { Text, Title } = Typography;
const { Option } = Select;

function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState('info');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Fetch product detail
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsService.getById(id!),
    enabled: !!id,
  });

  // Fetch stock movements (lazy, only when tab is active)
  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['product-stock', id],
    queryFn: () => productsService.getStockMovements(id!),
    enabled: !!id && activeTab === 'stock',
  });

  // Fetch categories for edit modal
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: productsService.getCategories,
    enabled: editModalOpen,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Product>) => productsService.update(id!, payload),
    onSuccess: () => {
      message.success('Cập nhật thành công');
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditModalOpen(false);
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Lỗi cập nhật'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => productsService.delete(id!),
    onSuccess: () => {
      message.success('Đã xóa sản phẩm');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Lỗi xóa sản phẩm'),
  });

  const handleEdit = () => {
    if (!product) return;
    form.setFieldsValue({
      name: product.name,
      code: product.code,
      sellingPrice: product.sellingPrice,
      costPrice: (product as any).costPrice,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      categoryId: product.categoryId,
    });
    setEditModalOpen(true);
  };

  const handleUpdate = () => {
    form.validateFields().then((values) => updateMutation.mutate(values));
  };

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>;
  if (!product) return <div style={{ padding: 40 }}>Không tìm thấy sản phẩm</div>;

  const categoryName = (product as any).category?.name || '';

  const tabItems = [
    {
      key: 'info',
      label: <span><AppstoreOutlined /> Thông tin</span>,
      children: (
        <div style={{ padding: '20px 0' }}>
          <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
            {/* Left: image placeholder */}
            <div style={{
              width: 120, height: 120, background: '#f5f5f5', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #e8e8e8', flexShrink: 0,
            }}>
              <InboxOutlined style={{ fontSize: 40, color: '#ccc' }} />
            </div>
            {/* Right: name + category + tags */}
            <div>
              <Title level={4} style={{ margin: '0 0 6px' }}>{product.name}</Title>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">Nhóm hàng: </Text>
                <Text strong style={{ color: '#1677ff' }}>{categoryName}</Text>
              </div>
              <Space wrap>
                <Tag>Hàng hóa thường</Tag>
                {product.isActive ? <Tag color="green">Đang kinh doanh</Tag> : <Tag color="red">Ngừng kinh doanh</Tag>}
              </Space>
            </div>
          </div>

          {/* Info grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '16px 24px', borderTop: '1px solid #f0f0f0', paddingTop: 16,
          }}>
            {[
              { label: 'Mã hàng', value: <Text strong>{product.code}</Text> },
              { label: 'Mã vạch', value: <Text type="secondary">Chưa có</Text> },
              { label: 'Tồn kho', value: <Text strong style={{ fontSize: 16, color: product.stock <= product.minStock ? '#f5222d' : '#222' }}>{product.stock}</Text> },
              { label: 'Định mức tồn', value: <Text type="secondary">{product.minStock} – 999,999,999</Text> },
              { label: 'Giá vốn', value: isAdmin ? <Text strong>{formatCurrency((product as any).costPrice || 0)}</Text> : <Text type="secondary">—</Text> },
              { label: 'Giá bán', value: <Text strong style={{ color: '#52c41a' }}>{formatCurrency(product.sellingPrice)}</Text> },
              { label: 'Đơn vị', value: <Text>{product.unit}</Text> },
              { label: 'Trọng lượng', value: <Text type="secondary">0 g</Text> },
            ].map(({ label, value }) => (
              <div key={label}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>{label}</Text>
                {value}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: 'stock',
      label: <span><HistoryOutlined /> Thẻ kho</span>,
      children: (
        <div style={{ marginTop: 8 }}>
          {stockLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : (
            <Table
              dataSource={stockData?.movements || []}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 20, showSizeChanger: false }}
              scroll={{ x: 800 }}
              columns={[
                {
                  title: 'Chứng từ',
                  dataIndex: 'chungTu',
                  key: 'chungTu',
                  width: 120,
                  render: (v: string) => <Text style={{ color: '#1677ff', fontWeight: 600 }}>{v}</Text>,
                },
                {
                  title: 'Thời gian',
                  dataIndex: 'thoiGian',
                  key: 'thoiGian',
                  width: 140,
                  render: (d: string) => <Text style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{formatDateTime(d)}</Text>,
                },
                {
                  title: 'Loại giao dịch',
                  dataIndex: 'loaiGiaoDich',
                  key: 'loaiGiaoDich',
                  width: 130,
                  render: (v: string) => <Tag color={v === 'Xuất bán' ? 'orange' : v === 'Nhập hàng' ? 'green' : 'blue'}>{v}</Tag>,
                },
                {
                  title: 'Đối tác',
                  dataIndex: 'doiTac',
                  key: 'doiTac',
                  render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
                },
                {
                  title: 'Giá GD',
                  dataIndex: 'giaGD',
                  key: 'giaGD',
                  width: 110,
                  align: 'right' as const,
                  render: (v: number) => <Text style={{ fontSize: 12 }}>{formatCurrency(v)}</Text>,
                },
                {
                  title: 'Giá vốn',
                  dataIndex: 'giaVon',
                  key: 'giaVon',
                  width: 110,
                  align: 'right' as const,
                  render: (v: number) => isAdmin ? <Text style={{ fontSize: 12 }}>{formatCurrency(v)}</Text> : <Text type="secondary">—</Text>,
                },
                {
                  title: 'Số lượng',
                  dataIndex: 'soLuong',
                  key: 'soLuong',
                  width: 90,
                  align: 'right' as const,
                  render: (v: number) => (
                    <Text strong style={{ color: v < 0 ? '#f5222d' : '#52c41a', fontSize: 12 }}>
                      {v > 0 ? `+${v}` : v}
                    </Text>
                  ),
                },
                {
                  title: 'Tồn cuối',
                  dataIndex: 'tonCuoi',
                  key: 'tonCuoi',
                  width: 90,
                  align: 'right' as const,
                  render: (v: number) => <Text strong style={{ color: '#1677ff', fontSize: 12 }}>{v}</Text>,
                },
              ]}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ margin: -24, background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
      {/* Top product summary bar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e8e8e8',
        padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/products')}>
          Hàng hóa
        </Button>
        <div style={{ width: 1, height: 24, background: '#e8e8e8' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, overflow: 'hidden' }}>
          <div style={{
            width: 36, height: 36, background: '#f0f0f0', borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <InboxOutlined style={{ color: '#aaa' }} />
          </div>
          <Text code style={{ flexShrink: 0 }}>{product.code}</Text>
          <Text strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.name}
          </Text>
          <div style={{ display: 'flex', gap: 24, marginLeft: 'auto', flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Giá bán</Text>
              <Text strong style={{ color: '#52c41a' }}>{formatCurrency(product.sellingPrice)}</Text>
            </div>
            {isAdmin && (
              <div style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Giá vốn</Text>
                <Text strong>{formatCurrency((product as any).costPrice || 0)}</Text>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Tồn kho</Text>
              <Text strong style={{ color: product.stock <= product.minStock ? '#f5222d' : '#222' }}>
                {product.stock}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs content */}
      <div style={{ padding: '0 24px', background: '#fff' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </div>

      {/* Bottom actions */}
      {isAdmin && (
        <div style={{
          position: 'fixed', bottom: 0, left: 240, right: 0,
          background: '#fff', borderTop: '1px solid #e8e8e8',
          padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
          zIndex: 99,
        }}>
          <Popconfirm
            title="Xóa sản phẩm này?"
            description="Hành động không thể hoàn tác."
            onConfirm={() => deleteMutation.mutate()}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} loading={deleteMutation.isPending}>Xóa</Button>
          </Popconfirm>
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>Chỉnh sửa</Button>
        </div>
      )}

      {/* Edit modal */}
      <Modal
        title="Chỉnh sửa sản phẩm"
        open={editModalOpen}
        onOk={handleUpdate}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={updateMutation.isPending}
        okText="Lưu"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="Mã hàng" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="categoryId" label="Nhóm hàng">
            <Select allowClear placeholder="Chọn nhóm hàng">
              {(categoriesData || []).map((c: ProductCategory) => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="sellingPrice" label="Giá bán" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
            <Form.Item name="costPrice" label="Giá vốn">
              <InputNumber style={{ width: '100%' }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
            <Form.Item name="stock" label="Tồn kho">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="minStock" label="Tồn tối thiểu">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item name="unit" label="Đơn vị tính">
              <Input />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default ProductDetailPage;
