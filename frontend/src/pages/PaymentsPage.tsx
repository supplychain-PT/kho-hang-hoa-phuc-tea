import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Card, Typography, Tag, Tabs, Statistic, Row, Col,
  Collapse, Space, Button, Modal, Form, InputNumber, Select, Input, Alert,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { DollarOutlined, ExclamationCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { paymentsService, DebtByOwner } from '../services/payments.service';
import { formatCurrency, formatDateTime } from '../utils/format';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Option } = Select;

function PaymentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [debtPage, setDebtPage] = useState(1);
  const [collectModal, setCollectModal] = useState<{ open: boolean; orderId: string; orderNumber: string; remaining: number } | null>(null);
  const [collectForm] = Form.useForm();

  const { data: debtsData, isLoading: debtsLoading } = useQuery({
    queryKey: ['debts', debtPage],
    queryFn: () => paymentsService.getDebts({ page: debtPage, limit: 20 }),
    placeholderData: (prev: any) => prev,
  });

  const { data: debtByOwner, isLoading: ownerLoading } = useQuery({
    queryKey: ['debt-by-owner'],
    queryFn: paymentsService.getDebtByOwner,
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['payments-all'],
    queryFn: () => paymentsService.getAll({ limit: 50 }),
  });

  const collectMutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: any }) =>
      paymentsService.recordPayment(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['debt-by-owner'] });
      queryClient.invalidateQueries({ queryKey: ['payments-all'] });
      setCollectModal(null);
      collectForm.resetFields();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Lỗi ghi nhận thanh toán';
      import('antd').then(({ message }) => message.error(msg));
    },
  });

  const openCollect = (record: any) => {
    setCollectModal({
      open: true,
      orderId: record.order.id,
      orderNumber: record.order.orderNumber,
      remaining: record.remainingAmount,
    });
    collectForm.setFieldsValue({ paidAmount: record.remainingAmount });
  };

  const totalDebt = debtsData?.summary?.totalDebt || 0;
  const totalPaid = debtsData?.summary?.totalPaid || 0;

  const debtColumns = [
    {
      title: 'Số Đơn',
      dataIndex: ['order', 'orderNumber'],
      key: 'orderNumber',
      render: (num: string, record: any) => (
        <Button type="link" onClick={() => navigate(`/orders/${record.order.id}`)} style={{ padding: 0 }}>
          {num}
        </Button>
      ),
    },
    {
      title: 'Cửa Hàng',
      key: 'store',
      render: (_: any, record: any) => (
        <div>
          <Text strong>{record.order?.store?.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{record.order?.store?.code}</Text>
        </div>
      ),
    },
    {
      title: 'Chủ Cửa Hàng',
      key: 'owner',
      render: (_: any, record: any) => (
        <div>
          <Text>{record.order?.store?.owner?.fullName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{record.order?.store?.owner?.phone}</Text>
        </div>
      ),
    },
    {
      title: 'Tổng Tiền',
      dataIndex: 'totalAmount',
      key: 'total',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Đã TT',
      dataIndex: 'paidAmount',
      key: 'paid',
      render: (v: number) => <Text style={{ color: '#52c41a' }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Còn Nợ',
      dataIndex: 'remainingAmount',
      key: 'remaining',
      render: (v: number) => <Text strong style={{ color: '#f5222d' }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'createdAt',
      key: 'date',
      render: (d: string) => formatDateTime(d),
    },
    {
      title: '',
      key: 'action',
      width: 110,
      render: (_: any, record: any) => (
        <Button
          type="primary"
          size="small"
          icon={<DollarOutlined />}
          onClick={() => openCollect(record)}
          style={{ background: '#52c41a', borderColor: '#52c41a' }}
        >
          Thu Nợ
        </Button>
      ),
    },
  ];

  const paymentColumns = [
    {
      title: 'Số Đơn',
      dataIndex: ['order', 'orderNumber'],
      key: 'orderNumber',
      render: (num: string, record: any) => (
        <Button type="link" onClick={() => navigate(`/orders/${record.order.id}`)} style={{ padding: 0 }}>
          {num}
        </Button>
      ),
    },
    { title: 'Cửa Hàng', dataIndex: ['order', 'store', 'name'], key: 'store' },
    { title: 'Tổng Tiền', dataIndex: 'totalAmount', key: 'total', render: (v: number) => formatCurrency(v) },
    { title: 'Đã TT', dataIndex: 'paidAmount', key: 'paid', render: (v: number) => formatCurrency(v) },
    {
      title: 'Trạng Thái',
      dataIndex: 'isPaid',
      key: 'isPaid',
      render: (isPaid: boolean) => (
        <Tag color={isPaid ? 'green' : 'red'}>{isPaid ? 'Đã TT' : 'Còn Nợ'}</Tag>
      ),
    },
    {
      title: 'Hình Thức',
      dataIndex: 'paymentMethod',
      key: 'method',
      render: (m: string) => m === 'CASH' ? '💵 Tiền mặt' : m === 'BANK_TRANSFER' ? '🏦 CK' : '—',
    },
    {
      title: 'Ngày TT',
      dataIndex: 'paymentDate',
      key: 'payDate',
      render: (d: string) => d ? formatDateTime(d) : '—',
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>Quản Lý Công Nợ & Thanh Toán</Title>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderLeft: '4px solid #f5222d', background: '#fff1f0' }}>
            <Statistic
              title="Tổng Công Nợ Chưa Thu"
              value={totalDebt}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<ExclamationCircleOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderLeft: '4px solid #52c41a', background: '#f6ffed' }}>
            <Statistic
              title="Tổng Đã Thu"
              value={totalPaid}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderLeft: '4px solid #1890ff', background: '#e6f7ff' }}>
            <Statistic
              title="Số Đơn Còn Nợ"
              value={debtsData?.meta?.total || 0}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontSize: 32 }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="debts" size="large">
        {/* Tab 1: Danh sách công nợ */}
        <TabPane tab="Công Nợ Chưa Thu" key="debts">
          <Card styles={{ body: { padding: 0 } }}>
            <Table
              columns={debtColumns}
              dataSource={debtsData?.data || []}
              rowKey="id"
              loading={debtsLoading}
              scroll={{ x: 900 }}
              pagination={{
                current: debtPage,
                pageSize: 20,
                total: debtsData?.meta?.total || 0,
                onChange: setDebtPage,
                showTotal: (total) => `Tổng ${total} đơn còn nợ`,
              }}
              size="middle"
            />
          </Card>
        </TabPane>

        {/* Tab 2: Công nợ theo chủ CH */}
        <TabPane tab="Theo Chủ Cửa Hàng" key="by-owner">
          {ownerLoading ? null : (
            <Card>
              <Collapse accordion>
                {(debtByOwner || []).map((item: DebtByOwner) => (
                  <Panel
                    key={item.owner.id}
                    header={
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Space>
                          <Text strong>{item.owner.fullName}</Text>
                          <Text type="secondary">{item.owner.phone}</Text>
                          <Tag color="blue">{item.orderCount} đơn</Tag>
                        </Space>
                        <Text strong style={{ color: '#f5222d' }}>
                          {formatCurrency(item.totalDebt)}
                        </Text>
                      </div>
                    }
                  >
                    <Table
                      dataSource={item.orders}
                      rowKey="orderId"
                      size="small"
                      pagination={false}
                      columns={[
                        {
                          title: 'Số Đơn', dataIndex: 'orderNumber', key: 'num',
                          render: (num: string, rec: any) => (
                            <Button type="link" onClick={() => navigate(`/orders/${rec.orderId}`)} style={{ padding: 0 }}>{num}</Button>
                          ),
                        },
                        { title: 'Cửa Hàng', dataIndex: 'storeName', key: 'store' },
                        { title: 'Tổng Tiền', dataIndex: 'totalAmount', key: 'total', render: (v: number) => formatCurrency(v) },
                        { title: 'Đã TT', dataIndex: 'paidAmount', key: 'paid', render: (v: number) => <Text style={{ color: '#52c41a' }}>{formatCurrency(v)}</Text> },
                        { title: 'Còn Nợ', dataIndex: 'remainingAmount', key: 'rem', render: (v: number) => <Text strong style={{ color: '#f5222d' }}>{formatCurrency(v)}</Text> },
                        {
                          title: '',
                          key: 'action',
                          render: (_: any, rec: any) => (
                            <Button
                              size="small" type="primary" icon={<DollarOutlined />}
                              style={{ background: '#52c41a', borderColor: '#52c41a' }}
                              onClick={() => openCollect({
                                order: { id: rec.orderId, orderNumber: rec.orderNumber },
                                remainingAmount: rec.remainingAmount,
                              })}
                            >
                              Thu Nợ
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </Panel>
                ))}
              </Collapse>
            </Card>
          )}
        </TabPane>

        {/* Tab 3: Lịch sử */}
        <TabPane tab="Lịch Sử Thanh Toán" key="history">
          <Card styles={{ body: { padding: 0 } }}>
            <Table
              columns={paymentColumns}
              dataSource={paymentsData?.data || []}
              rowKey="id"
              scroll={{ x: 750 }}
              size="middle"
              pagination={{ showTotal: (t) => `Tổng ${t} bản ghi` }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* ═══ THU NỢ MODAL ═══════════════════════════════════════════════════════ */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: '#52c41a' }} />
            <span>Thu Nợ — Đơn <Text style={{ color: '#52c41a' }}>{collectModal?.orderNumber}</Text></span>
          </Space>
        }
        open={!!collectModal?.open}
        onCancel={() => { setCollectModal(null); collectForm.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        {collectModal && (
          <>
            <Alert
              message={`Số tiền còn nợ: ${formatCurrency(collectModal.remaining)}`}
              type="warning" showIcon style={{ marginBottom: 20 }}
            />
            <Form
              form={collectForm}
              layout="vertical"
              onFinish={(values) =>
                collectMutation.mutate({ orderId: collectModal.orderId, data: values })
              }
            >
              <Form.Item
                name="paidAmount"
                label="Số Tiền Thu (đ)"
                rules={[{ required: true, message: 'Nhập số tiền' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={collectModal.remaining}
                  size="large"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(v) => Number((v || '').replace(/\./g, ''))}
                />
              </Form.Item>
              <Form.Item
                name="paymentMethod"
                label="Hình Thức Thanh Toán"
                rules={[{ required: true, message: 'Chọn hình thức' }]}
              >
                <Select size="large">
                  <Option value="CASH">💵 Tiền Mặt</Option>
                  <Option value="BANK_TRANSFER">🏦 Chuyển Khoản</Option>
                </Select>
              </Form.Item>
              <Form.Item name="note" label="Ghi Chú">
                <Input.TextArea rows={2} placeholder="Ghi chú thu nợ (tùy chọn)" />
              </Form.Item>
              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => { setCollectModal(null); collectForm.resetFields(); }}>Hủy</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={collectMutation.isPending}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Xác Nhận Thu Nợ
                  </Button>
                </Space>
              </div>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}

export default PaymentsPage;
