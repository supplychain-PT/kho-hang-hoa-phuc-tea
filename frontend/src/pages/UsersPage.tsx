import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Input, Card, Typography, Modal, Form, message,
  Space, Tag, Select, Row, Col, Popconfirm, Switch,
} from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { usersService } from '../services/users.service';
import { getRoleLabel } from '../utils/format';
import { User } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

const roleColors: Record<string, string> = {
  ADMIN: 'red',
  WAREHOUSE_STAFF: 'blue',
  ACCOUNTANT: 'purple',
  STORE_OWNER: 'green',
};

function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, role],
    queryFn: () => usersService.getAll({ page, limit: 20, search, role }),
    placeholderData: (prev: any) => prev,
  });

  const createMutation = useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      message.success('Tạo tài khoản thành công');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi tạo tài khoản'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersService.update(id, data),
    onSuccess: () => {
      message.success('Cập nhật thành công');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      setEditingUser(null);
      form.resetFields();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi cập nhật'),
  });

  const deleteMutation = useMutation({
    mutationFn: usersService.delete,
    onSuccess: () => {
      message.success('Đã vô hiệu hóa tài khoản');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi'),
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({ ...user, password: '' });
    setModalOpen(true);
  };

  const handleSubmit = (values: any) => {
    const data = { ...values };
    if (!data.password) delete data.password;
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = [
    {
      title: 'Họ Tên',
      dataIndex: 'fullName',
      key: 'name',
      render: (name: string, record: User) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <div>
            <Text strong>{name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      render: (p: string) => p || '—',
    },
    {
      title: 'Vai Trò',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={roleColors[role] || 'default'}>{getRoleLabel(role)}</Tag>
      ),
    },
    {
      title: 'Cửa Hàng',
      key: 'stores',
      render: (_: any, record: User) => (
        <Space wrap>
          {record.stores?.slice(0, 2).map((s: any) => (
            <Tag key={s.id} style={{ margin: 0 }}>{s.code}</Tag>
          ))}
          {(record.stores?.length || 0) > 2 && (
            <Tag>+{(record.stores?.length || 0) - 2}</Tag>
          )}
          {(!record.stores || record.stores.length === 0) && '—'}
        </Space>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'isActive',
      key: 'active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Hoạt động' : 'Khóa'}</Tag>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Vô hiệu hóa tài khoản này?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Xác nhận"
            cancelText="Hủy"
            disabled={!record.isActive}
          >
            <Button size="small" danger icon={<DeleteOutlined />} disabled={!record.isActive} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Quản Lý Tài Khoản</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingUser(null); form.resetFields(); setModalOpen(true); }}>
          Thêm Tài Khoản
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={14}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm theo tên, email, SĐT..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={10}>
            <Select
              placeholder="Lọc theo vai trò"
              value={role}
              onChange={(val) => { setRole(val); setPage(1); }}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="ADMIN">Quản Trị Viên</Option>
              <Option value="WAREHOUSE_STAFF">Nhân Viên Kho</Option>
              <Option value="ACCOUNTANT">Kế Toán</Option>
              <Option value="STORE_OWNER">Chủ Cửa Hàng</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 800 }}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.meta.total || 0,
            onChange: setPage,
            showTotal: (total) => `Tổng ${total} tài khoản`,
          }}
          size="middle"
        />
      </Card>

      <Modal
        title={editingUser ? 'Chỉnh Sửa Tài Khoản' : 'Thêm Tài Khoản Mới'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingUser(null); form.resetFields(); }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fullName" label="Họ Tên" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Số Điện Thoại">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? 'Mật Khẩu Mới (bỏ trống nếu không đổi)' : 'Mật Khẩu'}
            rules={editingUser ? [] : [{ required: true, min: 6 }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item name="role" label="Vai Trò" rules={[{ required: true }]}>
            <Select>
              <Option value="ADMIN">Quản Trị Viên</Option>
              <Option value="WAREHOUSE_STAFF">Nhân Viên Kho</Option>
              <Option value="ACCOUNTANT">Kế Toán</Option>
              <Option value="STORE_OWNER">Chủ Cửa Hàng</Option>
            </Select>
          </Form.Item>

          {editingUser && (
            <Form.Item name="isActive" label="Trạng Thái" valuePropName="checked">
              <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
            </Form.Item>
          )}

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingUser ? 'Cập Nhật' : 'Tạo Mới'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default UsersPage;
