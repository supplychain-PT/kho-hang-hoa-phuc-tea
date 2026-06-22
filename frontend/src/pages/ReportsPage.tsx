import { useQuery } from '@tanstack/react-query';
import { Card, Row, Col, Statistic, Table, Typography, Tag, Space } from 'antd';
import {
  ShopOutlined, ShoppingOutlined, FileTextOutlined,
  CheckCircleOutlined, DollarOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { formatCurrency, formatNumber } from '../utils/format';

const { Title, Text } = Typography;

function ReportsPage() {
  const { data: overview } = useQuery({
    queryKey: ['reports-overview'],
    queryFn: async () => {
      const { data } = await api.get('/reports/overview');
      return data;
    },
  });

  const { data: topStores } = useQuery({
    queryKey: ['reports-top-stores'],
    queryFn: async () => {
      const { data } = await api.get('/reports/top-stores');
      return data;
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ['reports-top-products'],
    queryFn: async () => {
      const { data } = await api.get('/reports/top-products');
      return data;
    },
  });

  const storeColumns = [
    { title: 'STT', key: 'rank', render: (_: any, __: any, i: number) => i + 1, width: 50 },
    {
      title: 'Cửa Hàng',
      key: 'store',
      render: (_: any, record: any) => (
        <Space>
          <ShopOutlined style={{ color: '#52c41a' }} />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.code}</Text>
          </div>
        </Space>
      ),
    },
    { title: 'Số Đơn', dataIndex: ['_count', 'orders'], key: 'orders', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: 'Doanh Thu', key: 'revenue', render: (_: any, r: any) => <Text strong style={{ color: '#52c41a' }}>{formatCurrency(r.totalRevenue)}</Text> },
  ];

  const productColumns = [
    { title: 'STT', key: 'rank', render: (_: any, __: any, i: number) => i + 1, width: 50 },
    {
      title: 'Sản Phẩm',
      key: 'product',
      render: (_: any, record: any) => (
        <div>
          <Text strong>{record.product?.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.product?.code}</Text>
        </div>
      ),
    },
    { title: 'ĐVT', dataIndex: ['product', 'unit'], key: 'unit' },
    { title: 'SL Bán', dataIndex: 'totalQuantity', key: 'qty', render: (v: number) => <Tag color="blue">{formatNumber(v || 0)}</Tag> },
    { title: 'Doanh Thu', dataIndex: 'totalRevenue', key: 'rev', render: (v: number) => <Text strong style={{ color: '#52c41a' }}>{formatCurrency(v || 0)}</Text> },
    { title: 'Số Đơn', dataIndex: 'orderCount', key: 'count' },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>Báo Cáo & Thống Kê</Title>

      {/* Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Cửa Hàng', value: overview?.totalStores || 0, icon: <ShopOutlined />, color: '#1890ff', bg: '#e6f7ff' },
          { title: 'Sản Phẩm', value: overview?.totalProducts || 0, icon: <ShoppingOutlined />, color: '#52c41a', bg: '#f6ffed' },
          { title: 'Tổng Đơn', value: overview?.totalOrders || 0, icon: <FileTextOutlined />, color: '#722ed1', bg: '#f9f0ff' },
          { title: 'Đã Hoàn Thành', value: overview?.completedOrders || 0, icon: <CheckCircleOutlined />, color: '#52c41a', bg: '#f6ffed' },
          { title: 'Đã Thu', value: formatCurrency(overview?.totalRevenue || 0), icon: <DollarOutlined />, color: '#52c41a', bg: '#f6ffed', isText: true },
          { title: 'Còn Nợ', value: formatCurrency(overview?.totalDebt || 0), icon: <ExclamationCircleOutlined />, color: '#f5222d', bg: '#fff1f0', isText: true },
        ].map((item, i) => (
          <Col xs={24} sm={12} md={8} lg={4} key={i}>
            <Card style={{ borderLeft: `3px solid ${item.color}`, background: item.bg }} bodyStyle={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.title}</Text>
                  <div style={{ marginTop: 4 }}>
                    {item.isText ? (
                      <Text style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</Text>
                    ) : (
                      <Text style={{ fontSize: 24, fontWeight: 700 }}>{item.value}</Text>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 24, color: item.color }}>{item.icon}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Top 10 Cửa Hàng Đặt Hàng Nhiều Nhất">
            <Table
              columns={storeColumns}
              dataSource={topStores || []}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 400 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Top 20 Sản Phẩm Bán Chạy">
            <Table
              columns={productColumns}
              dataSource={topProducts || []}
              rowKey={(r: any) => r.product?.id}
              pagination={false}
              size="small"
              scroll={{ x: 500 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default ReportsPage;
