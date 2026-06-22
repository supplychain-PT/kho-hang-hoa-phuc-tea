import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Row, Col, Card, Statistic, Table, Tag, Typography, Spin, Button } from 'antd';
import {
  FileTextOutlined, ClockCircleOutlined, CarOutlined,
  CheckCircleOutlined, DollarOutlined, ArrowRightOutlined,
} from '@ant-design/icons';
import { ordersService } from '../services/orders.service';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDateTime, getOrderStatusLabel, getOrderStatusColor } from '../utils/format';
import { Order } from '../types';

const { Title, Text } = Typography;

function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: ordersService.getDashboard,
  });

  const stats = data?.stats;
  const recentOrders = data?.recentOrders || [];

  const statCards = [
    {
      title: 'Tổng Đơn Hàng',
      value: stats?.total || 0,
      icon: <FileTextOutlined style={{ fontSize: 28, color: '#1890ff' }} />,
      color: '#e6f7ff',
      borderColor: '#1890ff',
    },
    {
      title: 'Chờ Duyệt',
      value: stats?.pending || 0,
      icon: <ClockCircleOutlined style={{ fontSize: 28, color: '#faad14' }} />,
      color: '#fffbe6',
      borderColor: '#faad14',
    },
    {
      title: 'Đang Giao',
      value: stats?.shipping || 0,
      icon: <CarOutlined style={{ fontSize: 28, color: '#fa8c16' }} />,
      color: '#fff7e6',
      borderColor: '#fa8c16',
    },
    {
      title: 'Công Nợ',
      value: formatCurrency(stats?.totalDebt || 0),
      icon: <DollarOutlined style={{ fontSize: 28, color: '#f5222d' }} />,
      color: '#fff1f0',
      borderColor: '#f5222d',
      isText: true,
    },
  ];

  const columns = [
    {
      title: 'Số Đơn',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text: string, record: Order) => (
        <Button type="link" onClick={() => navigate(`/orders/${record.id}`)} style={{ padding: 0 }}>
          {text}
        </Button>
      ),
    },
    {
      title: 'Cửa Hàng',
      dataIndex: ['store', 'name'],
      key: 'store',
      render: (_: any, record: Order) => (
        <div>
          <Text strong>{record.store?.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.store?.code}</Text>
        </div>
      ),
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: 'Tổng Tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => <Text strong style={{ color: '#52c41a' }}>{formatCurrency(amount)}</Text>,
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: any) => (
        <Tag color={getOrderStatusColor(status)}>{getOrderStatusLabel(status)}</Tag>
      ),
    },
    {
      title: '',
      key: 'action',
      render: (_: any, record: Order) => (
        <Button type="text" icon={<ArrowRightOutlined />} onClick={() => navigate(`/orders/${record.id}`)} />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
          <Text type="secondary">Xin chào, {user?.fullName}</Text>
        </div>
        {(user?.role === 'STORE_OWNER') && (
          <Button type="primary" onClick={() => navigate('/orders/create')}>
            + Tạo Đơn Hàng
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card
              className="stat-card"
              style={{ borderLeft: `4px solid ${stat.borderColor}`, background: stat.color }}
              bodyStyle={{ padding: 20 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>{stat.title}</Text>
                  <div style={{ marginTop: 8 }}>
                    {stat.isText ? (
                      <Text style={{ fontSize: 22, fontWeight: 700, color: '#f5222d' }}>
                        {stat.value}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 32, fontWeight: 700 }}>{stat.value}</Text>
                    )}
                  </div>
                </div>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                  {stat.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Recent Orders */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Đơn Hàng Gần Đây</span>
            <Button type="link" onClick={() => navigate('/orders')}>
              Xem tất cả <ArrowRightOutlined />
            </Button>
          </div>
        }
        style={{ borderRadius: 12 }}
      >
        <Table
          columns={columns}
          dataSource={recentOrders}
          rowKey="id"
          pagination={false}
          scroll={{ x: 700 }}
          size="middle"
        />
      </Card>
    </div>
  );
}

export default DashboardPage;
