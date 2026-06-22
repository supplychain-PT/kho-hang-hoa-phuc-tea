import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Input, Card, Typography, Modal, Form, message,
  Space, Tag, Select, Row, Col,
} from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, ShopOutlined } from '@ant-design/icons';
import { storesService } from '../services/stores.service';
import { usersService } from '../services/users.service';
import { useAuthStore } from '../store/authStore';
import { Store } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

function StoresPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['stores', page, search],
    queryFn: () => storesService.getAll({ page, limit: 20, search }),
    placeholderData: (prev: any) => prev,
  });

  const { data: ownersData } = useQuery({
    queryKey: ['users', 'store-owners'],
    queryFn: () => usersService.getAll({ role: 'STORE_OWNER', limit: 100 }),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: storesService.create,
    onSuccess: () => {
      message.success('Tạo cửa hàng thành công');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi tạo cửa hàng'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => storesService.update(id, data),
    onSuccess: () => {
      message.success('Cập nhật thành công');
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setModalOpen(false);
      setEditingStore(null);
      form.resetFields();
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi cập nhật'),
  });

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    form.setFieldsValue({ ...store, ownerId: store.ownerId });
    setModalOpen(true);
  };

  const handleSubmit = (values: any) => {
    if (editingStore) {
      updateMutation.mutate({ id: editingStore.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    {
      title: 'Mã CH',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="blue" style={{ fontWeight: 600 }}>{code}</Tag>,
    },
    {
      title: 'Tên Cửa Hàng',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <ShopOutlined style={{ color: '#52c41a' }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Chủ Cửa Hàng',
      key: 'owner',
      render: (_: any, record: Store) => (
        <div>
          <Text>{record.owner?.fullName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.owner?.phone}</Text>
        </div>
      ),
    },
    {
      title: 'SĐT Cửa Hàng',
      dataIndex: 'phone',
      key: 'phone',
      render: (p: string) => p || '—',
    },
    {
      title: 'Địa Chỉ',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (a: string) => a || '—',
    },
    ...(isAdmin ? [{
      title: 'Thao Tác',
      key: 'actions',
      render: (_: any, record: Store) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
          Sửa
        </Button>
      ),
    }] : []),
  ];

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Danh Sách Cửa Hàng</Title>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingStore(null); form.resetFields(); setModalOpen(true); }}>
            Thêm Cửa Hàng
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo mã, tên cửa hàng..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 400 }}
          allowClear
        />
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
            showTotal: (total) => `Tổng ${total} cửa hàng`,
          }}
          size="middle"
        />
      </Card>

      <Modal
        title={editingStore ? 'Chỉnh Sửa Cửa Hàng' : 'Thêm Cửa Hàng Mới'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingStore(null); form.resetFields(); }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="code" label="Mã Cửa Hàng" rules={[{ required: true }]}>
                <Input disabled={!!editingStore} placeholder="PHUCTEA001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Số Điện Thoại">
                <Input placeholder="0901234567" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="name" label="Tên Cửa Hàng" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="address" label="Địa Chỉ">
            <Input />
          </Form.Item>

          <Form.Item name="ownerId" label="Chủ Cửa Hàng" rules={[{ required: true }]}>
            <Select placeholder="Chọn chủ cửa hàng" showSearch optionFilterProp="children">
              {ownersData?.data?.map((owner: any) => (
                <Option key={owner.id} value={owner.id}>
                  {owner.fullName} ({owner.email})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingStore ? 'Cập Nhật' : 'Tạo Mới'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default StoresPage;
