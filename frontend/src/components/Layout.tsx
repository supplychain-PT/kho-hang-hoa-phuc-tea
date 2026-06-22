import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Menu, Avatar, Dropdown, Typography, Space, Button, Tag,
} from 'antd';
import {
  DashboardOutlined, ShoppingOutlined, ShopOutlined, FileTextOutlined,
  AccountBookOutlined, BarChartOutlined, TeamOutlined, LogoutOutlined,
  UserOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PlusOutlined,
  FileDoneOutlined, ShoppingCartOutlined, ImportOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { getRoleLabel } from '../utils/format';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const getRoleColor = (role: string) => {
  const colors: Record<string, string> = {
    ADMIN: 'red',
    WAREHOUSE_STAFF: 'blue',
    ACCOUNTANT: 'purple',
    STORE_OWNER: 'green',
  };
  return colors[role] || 'default';
};

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const role = user?.role || '';

  const allMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      roles: ['ADMIN', 'WAREHOUSE_STAFF', 'ACCOUNTANT', 'STORE_OWNER'],
    },
    {
      key: '/products',
      icon: <ShoppingOutlined />,
      label: 'Sản Phẩm',
      roles: ['ADMIN', 'WAREHOUSE_STAFF', 'ACCOUNTANT', 'STORE_OWNER'],
    },
    {
      key: '/stores',
      icon: <ShopOutlined />,
      label: 'Cửa Hàng',
      roles: ['ADMIN', 'ACCOUNTANT'],
    },
    {
      key: '/purchase-receipts',
      icon: <ImportOutlined />,
      label: 'Nhập Hàng',
      roles: ['ADMIN', 'WAREHOUSE_STAFF'],
    },
    {
      key: '/orders',
      icon: <FileTextOutlined />,
      label: 'Đơn Hàng',
      roles: ['ADMIN', 'WAREHOUSE_STAFF', 'ACCOUNTANT', 'STORE_OWNER'],
    },
    {
      key: '/invoices',
      icon: <FileDoneOutlined />,
      label: 'Hóa Đơn',
      roles: ['ADMIN', 'WAREHOUSE_STAFF', 'ACCOUNTANT', 'STORE_OWNER'],
    },
    {
      key: '/payments',
      icon: <AccountBookOutlined />,
      label: 'Công Nợ',
      roles: ['ADMIN', 'ACCOUNTANT'],
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: 'Báo Cáo',
      roles: ['ADMIN', 'ACCOUNTANT'],
    },
    {
      key: '/users',
      icon: <TeamOutlined />,
      label: 'Tài Khoản',
      roles: ['ADMIN'],
    },
  ];

  const menuItems = allMenuItems
    .filter((item) => item.roles.includes(role))
    .map(({ key, icon, label }) => ({ key, icon, label }));

  const selectedKey = menuItems.find((item) =>
    location.pathname === item.key || (item.key !== '/' && location.pathname.startsWith(item.key))
  )?.key || '/dashboard';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{ position: 'fixed', height: '100vh', left: 0, top: 0, bottom: 0, zIndex: 100 }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '0 16px',
          background: 'rgba(255,255,255,0.05)',
        }}>
          {collapsed ? (
            <div style={{ fontSize: 20, color: '#52c41a', fontWeight: 800 }}>PT</div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#52c41a', fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>
                PHÚC TEA
              </div>
              <div style={{ color: '#ffffff80', fontSize: 11 }}>| THE HOA |</div>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        <Header style={{
          position: 'sticky',
          top: 0,
          zIndex: 99,
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16 }}
          />

          <Space align="center" size={16}>
            {['ADMIN', 'WAREHOUSE_STAFF', 'STORE_OWNER'].includes(role) && (
              <Button
                type="primary"
                icon={<ShoppingCartOutlined />}
                onClick={() => navigate('/sell')}
                style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 600 }}
              >
                Bán hàng
              </Button>
            )}
            <Tag color={getRoleColor(role)} style={{ margin: 0 }}>
              {getRoleLabel(role)}
            </Tag>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#52c41a' }}
                />
                <Text strong style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.fullName}
                </Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: 24, minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default AppLayout;
