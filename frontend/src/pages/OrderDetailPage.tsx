import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Descriptions, Tag, Table, Button, Space, Typography, Spin,
  message, Popconfirm, Steps, Row, Col, Modal, Form, InputNumber,
  Select, Input, Alert, Drawer, Divider, AutoComplete,
} from 'antd';
import {
  ArrowLeftOutlined, DollarOutlined, EditOutlined, PlusOutlined, MinusOutlined,
  DeleteOutlined, CreditCardOutlined, FileDoneOutlined, HolderOutlined,
} from '@ant-design/icons';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ordersService } from '../services/orders.service';
import { productsService } from '../services/products.service';
import { paymentsService } from '../services/payments.service';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDateTime, getOrderStatusLabel, getOrderStatusColor } from '../utils/format';

const { Title, Text } = Typography;
const { Option } = Select;

const statusSteps = ['DRAFT', 'COMPLETED'];

interface EditItem {
  productId: string;
  code: string;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discount: number; // per-line discount (VNĐ)
}

// ─── Sortable row component ───────────────────────────────────────────────────
function SortableItem({
  item,
  onChangeQty,
  onSetQty,
  onSetDiscount,
  onRemove,
}: {
  item: EditItem;
  onChangeQty: (id: string, delta: number) => void;
  onSetQty: (id: string, qty: number) => void;
  onSetDiscount: (id: string, val: number) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.productId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderBottom: '1px solid #f0f0f0',
    borderRadius: 8,
    marginBottom: 6,
    background: isDragging ? '#e6f7ff' : '#fafafa',
    cursor: 'default',
  };

  const lineTotal = Math.max(0, item.unitPrice * item.quantity - item.discount);

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', color: '#ccc', padding: '0 4px', flexShrink: 0 }}
        title="Kéo để sắp xếp"
      >
        <HolderOutlined style={{ fontSize: 16 }} />
      </div>

      {/* Product info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        <div style={{ fontSize: 11, color: '#999' }}>{item.unit} · {formatCurrency(item.unitPrice)}/đvt</div>
      </div>

      {/* Quantity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <Button size="small" icon={<MinusOutlined />} onClick={() => onChangeQty(item.productId, -1)} disabled={item.quantity <= 1} />
        <InputNumber
          size="small" min={1} value={item.quantity}
          onChange={(v) => onSetQty(item.productId, v || 1)}
          style={{ width: 56 }} controls={false}
        />
        <Button size="small" icon={<PlusOutlined />} onClick={() => onChangeQty(item.productId, 1)} />
      </div>

      {/* Per-line discount */}
      <div style={{ flexShrink: 0, width: 90 }}>
        <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>Giảm (đ)</div>
        <InputNumber
          size="small" min={0} value={item.discount}
          onChange={(v) => onSetDiscount(item.productId, v || 0)}
          style={{ width: '100%' }} controls={false}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={(v) => Number((v || '').replace(/\./g, ''))}
        />
      </div>

      {/* Line total */}
      <div style={{ width: 100, textAlign: 'right', fontWeight: 700, color: '#52c41a', fontSize: 13, flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: '#aaa', fontWeight: 400 }}>Thành tiền</div>
        {formatCurrency(lineTotal)}
      </div>

      {/* Delete */}
      <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onRemove(item.productId)} style={{ flexShrink: 0 }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [processDrawerOpen, setProcessDrawerOpen] = useState(false);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [payForm] = Form.useForm();

  const isAdmin = user?.role === 'ADMIN';
  const isWarehouse = user?.role === 'WAREHOUSE_STAFF';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const canManage = isAdmin || isWarehouse;
  const canPay = isAdmin || isAccountant;

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersService.getById(id!),
    enabled: !!id,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => productsService.getAll({ search: productSearch, limit: 20 }),
    enabled: processDrawerOpen && productSearch.length >= 1,
  });

  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const processOrderMutation = useMutation({
    mutationFn: (payload: any) => ordersService.processOrder(id!, payload),
    onSuccess: () => {
      message.success('Xử lý đơn hàng thành công!');
      invalidateOrder();
      setProcessDrawerOpen(false);
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi xử lý đơn'),
  });

  const payMutation = useMutation({
    mutationFn: (data: any) => paymentsService.recordPayment(id!, data),
    onSuccess: () => {
      message.success('Ghi nhận thanh toán thành công');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setPaymentModalOpen(false);
      payForm.resetFields();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi thanh toán'),
  });

  // ── DnD sensors ──────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditItems((items) => {
        const oldIdx = items.findIndex((i) => i.productId === active.id);
        const newIdx = items.findIndex((i) => i.productId === over.id);
        return arrayMove(items, oldIdx, newIdx);
      });
    }
  };

  // ── Open drawer ───────────────────────────────────────────────────────────────
  const openProcessDrawer = () => {
    if (!order) return;
    const items: EditItem[] = (order.items || []).map((item: any) => ({
      productId: item.product.id,
      code: item.product.code,
      name: item.product.name,
      unit: item.product.unit,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      discount: item.discount ?? 0,
    }));
    setEditItems(items);
    setTotalDiscount(order.discount ?? 0);
    setProcessDrawerOpen(true);
  };

  // ── Item helpers ─────────────────────────────────────────────────────────────
  const changeQty = (productId: string, delta: number) =>
    setEditItems((prev) => prev.map((i) =>
      i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));

  const setQty = (productId: string, qty: number) =>
    setEditItems((prev) => prev.map((i) =>
      i.productId === productId ? { ...i, quantity: Math.max(1, qty || 1) } : i));

  const setDiscount = (productId: string, val: number) =>
    setEditItems((prev) => prev.map((i) =>
      i.productId === productId ? { ...i, discount: val } : i));

  const removeItem = (productId: string) =>
    setEditItems((prev) => prev.filter((i) => i.productId !== productId));

  const addProduct = (product: any) => {
    const exists = editItems.find((i) => i.productId === product.id);
    if (exists) {
      changeQty(product.id, 1);
    } else {
      setEditItems((prev) => [...prev, {
        productId: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        unitPrice: product.sellingPrice,
        quantity: 1,
        discount: 0,
      }]);
    }
    setProductSearch('');
  };

  const subtotal = editItems.reduce((s, i) => s + Math.max(0, i.unitPrice * i.quantity - i.discount), 0);
  const grandTotal = Math.max(0, subtotal - totalDiscount);

  const handleProcess = (payNow: boolean, paymentMethod?: string) => {
    if (editItems.length === 0) { message.error('Đơn hàng phải có ít nhất 1 sản phẩm'); return; }
    processOrderMutation.mutate({
      items: editItems.map((i, idx) => ({
        productId: i.productId,
        quantity: i.quantity,
        discount: i.discount,
        sortOrder: idx,
      })),
      totalDiscount,
      payNow,
      paymentMethod,
    });
  };

  if (isLoading || !order) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  const currentStep = order.status === 'CANCELLED' ? -1 : statusSteps.indexOf(order.status);

  // ── Order items table (read-only view) ───────────────────────────────────────
  const itemColumns = [
    {
      title: 'Tên Sản Phẩm',
      dataIndex: ['product', 'name'],
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    { title: 'ĐVT', dataIndex: ['product', 'unit'], key: 'unit', width: 70 },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 60,
      render: (qty: number) => <Text strong style={{ color: '#1890ff' }}>{qty}</Text>,
    },
    {
      title: 'Đơn Giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      render: (price: number) => formatCurrency(price),
    },
    {
      title: 'Giảm Giá',
      dataIndex: 'discount',
      key: 'discount',
      width: 110,
      render: (v: number) => v > 0 ? (
        <Text style={{ color: '#fa541c' }}>-{formatCurrency(v)}</Text>
      ) : '—',
    },
    {
      title: 'Thành Tiền',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 130,
      render: (price: number) => (
        <Text strong style={{ color: '#52c41a' }}>{formatCurrency(price)}</Text>
      ),
    },
  ];

  // Autocomplete options
  const productOptions = (productsData?.data || []).map((p: any) => ({
    value: p.id,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{p.name} <Text type="secondary" style={{ fontSize: 11 }}>{p.unit}</Text></span>
        <Text strong style={{ color: '#52c41a', marginLeft: 8 }}>{formatCurrency(p.sellingPrice)}</Text>
      </div>
    ),
    product: p,
  }));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>Quay Lại</Button>
          <Title level={4} style={{ margin: 0 }}>
            Đơn Hàng: <Text style={{ color: '#52c41a' }}>{order.orderNumber}</Text>
          </Title>
          <Tag color={getOrderStatusColor(order.status)} style={{ fontSize: 14, padding: '2px 10px' }}>
            {getOrderStatusLabel(order.status)}
          </Tag>
        </Space>
        <Space wrap>
          {canManage && order.status === 'DRAFT' && (
            <Button type="primary" icon={<EditOutlined />} onClick={openProcessDrawer}
              style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 600 }} size="large">
              Hoàn Thành Đơn Hàng
            </Button>
          )}
          {canPay && order.status === 'COMPLETED' && order.payment && !order.payment.isPaid && (
            <Button icon={<DollarOutlined />} onClick={() => setPaymentModalOpen(true)} style={{ color: '#722ed1', borderColor: '#722ed1' }}>
              Ghi Nhận Thanh Toán
            </Button>
          )}
        </Space>
      </div>

      {/* Status Timeline */}
      <Card style={{ marginBottom: 16 }}>
        <Steps current={currentStep} items={[
          { title: 'Phiếu Tạm', description: formatDateTime(order.createdAt) },
          { title: 'Hoàn Thành', description: order.completedAt ? formatDateTime(order.completedAt) : '—' },
        ]} />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Thông Tin Đơn Hàng" style={{ marginBottom: 16 }}>
            <Descriptions bordered column={{ xs: 1, sm: 2 }} size="middle">
              <Descriptions.Item label="Số Đơn">{order.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="Trạng Thái">
                <Tag color={getOrderStatusColor(order.status)}>{getOrderStatusLabel(order.status)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Cửa Hàng">
                <strong>{order.store?.name}</strong> ({order.store?.code})
              </Descriptions.Item>
              <Descriptions.Item label="Người Tạo">{order.createdBy?.fullName}</Descriptions.Item>
              <Descriptions.Item label="Ngày Tạo">{formatDateTime(order.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="Tổng Tiền">
                <Text strong style={{ fontSize: 18, color: '#52c41a' }}>{formatCurrency(order.totalAmount)}</Text>
              </Descriptions.Item>
              {order.discount > 0 && (
                <Descriptions.Item label="Giảm Giá Đơn">
                  <Text style={{ color: '#fa541c' }}>-{formatCurrency(order.discount)}</Text>
                </Descriptions.Item>
              )}
              {order.note && <Descriptions.Item label="Ghi Chú" span={2}>{order.note}</Descriptions.Item>}
            </Descriptions>
          </Card>

          <Card title={`Danh Sách Hàng Hóa (${order.items?.length || 0} sản phẩm)`}>
            <Table
              columns={itemColumns}
              dataSource={order.items || []}
              rowKey="id"
              pagination={false}
              scroll={{ x: 650 }}
              size="middle"
              summary={() => (
                <Table.Summary>
                  {order.discount > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={5} align="right">
                        <Text type="secondary">Giảm giá toàn đơn</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        <Text style={{ color: '#fa541c' }}>-{formatCurrency(order.discount)}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5}><Text strong>Tổng Cộng</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={5}>
                      <Text strong style={{ fontSize: 16, color: '#52c41a' }}>{formatCurrency(order.totalAmount)}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Thông Tin Cửa Hàng" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Mã CH">{order.store?.code}</Descriptions.Item>
              <Descriptions.Item label="Tên CH">{order.store?.name}</Descriptions.Item>
              <Descriptions.Item label="Địa Chỉ">{order.store?.address || '—'}</Descriptions.Item>
              <Descriptions.Item label="SĐT">{order.store?.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Chủ CH">{order.store?.owner?.fullName}</Descriptions.Item>
            </Descriptions>
          </Card>

          {order.payment && (
            <Card title="Thanh Toán / Công Nợ">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Tổng Tiền">
                  <Text strong>{formatCurrency(order.payment.totalAmount)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Đã Thanh Toán">
                  <Text style={{ color: '#52c41a' }}>{formatCurrency(order.payment.paidAmount)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Còn Lại">
                  <Text strong style={{ color: order.payment.remainingAmount > 0 ? '#f5222d' : '#52c41a' }}>
                    {formatCurrency(order.payment.remainingAmount)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng Thái">
                  <Tag color={order.payment.isPaid ? 'green' : 'red'}>
                    {order.payment.isPaid ? 'Đã Thanh Toán' : 'Còn Nợ'}
                  </Tag>
                </Descriptions.Item>
                {order.payment.paymentMethod && (
                  <Descriptions.Item label="Hình Thức">
                    {order.payment.paymentMethod === 'CASH' ? '💵 Tiền Mặt' : '🏦 Chuyển Khoản'}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}
        </Col>
      </Row>

      {/* ═══ PROCESS ORDER DRAWER ═══════════════════════════════════════════════ */}
      <Drawer
        title={
          <Space>
            <EditOutlined />
            <span>Hoàn Thành Đơn Hàng — <Text style={{ color: '#52c41a' }}>{order.orderNumber}</Text></span>
          </Space>
        }
        open={processDrawerOpen}
        onClose={() => setProcessDrawerOpen(false)}
        width={720}
        footer={null}
        styles={{ body: { paddingBottom: 240 } }}
      >
        {/* Store info */}
        <Alert
          message={<span>🏪 <strong>{order.store?.name}</strong> ({order.store?.code}) — Chủ: <strong>{order.store?.owner?.fullName}</strong></span>}
          type="info" style={{ marginBottom: 16 }}
        />

        {/* Add product — autocomplete */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#555', fontSize: 13 }}>
            <PlusOutlined /> Thêm sản phẩm
          </div>
          <AutoComplete
            style={{ width: '100%' }}
            options={productOptions}
            value={productSearch}
            onChange={setProductSearch}
            onSelect={(_val: string, option: any) => addProduct(option.product)}
            placeholder="🔍 Gõ để tìm theo tên sản phẩm..."
            size="large"
            allowClear
          />
        </div>

        <Divider style={{ margin: '12px 0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Danh sách ({editItems.length} sản phẩm) — kéo <HolderOutlined /> để sắp xếp</Text>
        </Divider>

        {/* Sortable items list */}
        {editItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
            Chưa có sản phẩm nào. Tìm và thêm ở trên.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={editItems.map((i) => i.productId)} strategy={verticalListSortingStrategy}>
              {editItems.map((item) => (
                <SortableItem
                  key={item.productId}
                  item={item}
                  onChangeQty={changeQty}
                  onSetQty={setQty}
                  onSetDiscount={setDiscount}
                  onRemove={removeItem}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* ─── Fixed footer ─────────────────────────────────────────────────────── */}
        <div style={{
          position: 'fixed', bottom: 0, right: 0, width: 720,
          background: '#fff', borderTop: '2px solid #f0f0f0', padding: '14px 24px', zIndex: 1000,
        }}>
          {/* Discount on total order */}
          <Row gutter={12} align="middle" style={{ marginBottom: 12 }}>
            <Col flex="auto">
              <Text style={{ fontSize: 13 }}>
                Tạm tính: <strong>{formatCurrency(subtotal)}</strong>
              </Text>
            </Col>
            <Col>
              <Space>
                <Text style={{ fontSize: 13 }}>Giảm giá đơn (đ):</Text>
                <InputNumber
                  size="small" min={0} value={totalDiscount}
                  onChange={(v) => setTotalDiscount(v || 0)}
                  style={{ width: 120 }} controls={false}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(v) => Number((v || '').replace(/\./g, ''))}
                />
              </Space>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 15 }}>Tổng thanh toán:</Text>
            <Text strong style={{ fontSize: 22, color: '#52c41a' }}>{formatCurrency(grandTotal)}</Text>
          </div>

          <Row gutter={12}>
            <Col span={12}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>💳 Thanh toán ngay</div>
              <Space.Compact style={{ width: '100%' }}>
                <Button block
                  style={{ background: '#1890ff', color: '#fff', borderColor: '#1890ff', fontWeight: 600 }}
                  loading={processOrderMutation.isPending} icon={<CreditCardOutlined />}
                  onClick={() => handleProcess(true, 'CASH')}
                >
                  Tiền Mặt
                </Button>
                <Button block
                  style={{ background: '#722ed1', color: '#fff', borderColor: '#722ed1', fontWeight: 600 }}
                  loading={processOrderMutation.isPending}
                  onClick={() => handleProcess(true, 'BANK_TRANSFER')}
                >
                  Chuyển Khoản
                </Button>
              </Space.Compact>
            </Col>
            <Col span={12}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>📋 Ghi công nợ</div>
              <Button block
                style={{ background: '#fa8c16', color: '#fff', borderColor: '#fa8c16', fontWeight: 600, height: 32 }}
                loading={processOrderMutation.isPending} icon={<FileDoneOutlined />}
                onClick={() => handleProcess(false)}
              >
                Duyệt & Ghi Nợ
              </Button>
            </Col>
          </Row>
        </div>
      </Drawer>

      {/* ═══ PAYMENT MODAL ══════════════════════════════════════════════════════ */}
      <Modal
        title="Ghi Nhận Thanh Toán"
        open={paymentModalOpen}
        onCancel={() => { setPaymentModalOpen(false); payForm.resetFields(); }}
        footer={null}
      >
        {order.payment && (
          <Alert
            message={`Số tiền còn lại: ${formatCurrency(order.payment.remainingAmount)}`}
            type="info" showIcon style={{ marginBottom: 16 }}
          />
        )}
        <Form form={payForm} layout="vertical" onFinish={(values) => payMutation.mutate(values)}>
          <Form.Item name="paidAmount" label="Số Tiền Thanh Toán (đ)" rules={[{ required: true, message: 'Nhập số tiền' }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={order.payment?.remainingAmount}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} size="large" />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Hình Thức Thanh Toán" rules={[{ required: true }]}>
            <Select size="large">
              <Option value="CASH">💵 Tiền Mặt</Option>
              <Option value="BANK_TRANSFER">🏦 Chuyển Khoản</Option>
            </Select>
          </Form.Item>
          <Form.Item name="note" label="Ghi Chú">
            <Input.TextArea rows={2} />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setPaymentModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={payMutation.isPending}>Xác Nhận Thanh Toán</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default OrderDetailPage;
