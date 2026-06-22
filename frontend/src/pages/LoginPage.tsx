import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Space, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(values.email, values.password);
      setAuth(response.user, response.accessToken, response.refreshToken);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 16px' }}>
        {/* Logo Area */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #52c41a, #389e0d)',
            marginBottom: 16,
            boxShadow: '0 8px 24px rgba(82, 196, 26, 0.3)',
          }}>
            <span style={{ fontSize: 32, color: '#fff', fontWeight: 800 }}>PT</span>
          </div>
          <Title level={2} style={{ margin: 0, color: '#1f1f1f' }}>
            PHÚC TEA <Text style={{ color: '#999', fontSize: 18 }}>|</Text> THE HOA
          </Title>
          <Text type="secondary">Hệ thống quản lý đặt hàng nhượng quyền</Text>
        </div>

        <Card
          style={{
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
            border: 'none',
          }}
          bodyStyle={{ padding: 40 }}
        >
          <Title level={4} style={{ marginBottom: 24, textAlign: 'center' }}>
            Đăng Nhập
          </Title>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              style={{ marginBottom: 20, borderRadius: 8 }}
              onClose={() => setError(null)}
            />
          )}

          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              label="Tên đăng nhập"
              rules={[
                { required: true, message: 'Vui lòng nhập tên đăng nhập' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#999' }} />}
                placeholder="admin@phuctea.vn hoặc vanphuochuynh.ccn"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#999' }} />}
                placeholder="Mật khẩu"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #52c41a, #389e0d)',
                  border: 'none',
                }}
              >
                Đăng Nhập
              </Button>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '24px 0 16px' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Tài khoản hệ thống</Text>
          </Divider>

          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            {[
              { label: 'Admin', email: 'admin@phuctea.vn', password: 'Admin@123456' },
              { label: 'Kho', email: 'warehouse@phuctea.vn', password: 'Warehouse@123456' },
              { label: 'Kế toán', email: 'accountant@phuctea.vn', password: 'Accountant@123456' },
              { label: 'Chủ CH', email: 'caothidiemtram.ccn', password: 'Phuctea.3103' },
            ].map((acc) => (
              <div
                key={acc.email}
                style={{
                  padding: '8px 12px',
                  background: '#f5f5f5',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Text strong style={{ fontSize: 12 }}>{acc.label}:</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{acc.email}</Text>
              </div>
            ))}
          </Space>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
