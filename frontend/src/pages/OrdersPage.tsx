import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Tag, Typography, DatePicker,
  message, Popconfirm, Input, Tooltip, Spin,
  Checkbox, Radio, Space, Divider, Select,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EyeOutlined,
  FileExcelOutlined, FilterOutlined, DownloadOutlined, ToolOutlined, DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ordersService } from '../services/orders.service';
import { useAuthStore } from '../store/authStore';
import {
  formatCurrency, formatDateTime,
  getOrderStatusLabel, getOrderStatusColor,
} from '../utils/format';
import { exportToExcel } from '../utils/exportExcel';
import { Order, OrderStatus, OrderItem } from '../types';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const ALL_STATUSES = [
  { value: 'DRAFT',     label: 'Phiếu tạm' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
];

// Colored text (no tag background) — matches KiotViet style
const STATUS_TEXT_COLOR: Record<string, string> = {
  DRAFT:     '#888',
  COMPLETED: '#52c41a',
};

function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const isAdmin    = user?.role === 'ADMIN';
  const isWarehouse = user?.role === 'WAREHOUSE_STAFF';
  const isStoreOwner = user?.role === 'STORE_OWNER';
  const canManage  = isAdmin || isWarehouse;

  /* ── Filter state ───────────────────────────────────────── */
  const [search, setSearch] = useState('');
  const [timeMode, setTimeMode] = useState<'month' | 'custom'>('month');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [checkedStatuses, setCheckedStatuses] = useState<string[]>([]);  // empty = all
  const [page, setPage] = useState(1);

  /* ── Expand & selection ─────────────────────────────────── */
  const [expandedItems, setExpandedItems] = useState<Record<string, OrderItem[] | null>>({});
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  /* ── Computed dates ─────────────────────────────────────── */
  const dateFrom = useMemo(() => {
    if (timeMode === 'month') return dayjs().startOf('month').format('YYYY-MM-DD');
    return dateRange?.[0]?.format('YYYY-MM-DD');
  }, [timeMode, dateRange]);

  const dateTo = useMemo(() => {
    if (timeMode === 'month') return dayjs().endOf('month').format('YYYY-MM-DD');
    return dateRange?.[1]?.format('YYYY-MM-DD');
  }, [timeMode, dateRange]);

  const statusIn = checkedStatuses.length > 0 ? checkedStatuses.join(',') : undefined;

  const queryParams = {
    page,
    limit: 20,
    search,
    statusIn,
    dateFrom,
    dateTo,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['orders', queryParams],
    queryFn: () => ordersService.getAll(queryParams),
    placeholderData: (prev: any) => prev,
  });

  /* ── Totals ─────────────────────────────────────────────── */
  const summaryNeed = useMemo(() =>
    (data?.data || []).reduce((s: number, o: Order) => s + o.totalAmount, 0), [data]);
  const summaryPaid = useMemo(() =>
    (data?.data || []).reduce((s: number, o: Order) => s + (o.payment?.paidAmount || 0), 0), [data]);

  /* ── Mutations ──────────────────────────────────────────── */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const onError = (e: any) => message.error(e?.response?.data?.message || 'Lỗi thao tác');

  const deleteMutation   = useMutation({ mutationFn: ordersService.deleteOrder, onSuccess: () => { message.success('Đã xóa đơn hàng'); invalidate(); }, onError });

  /* ── Expand ─────────────────────────────────────────────── */
  const toggleExpand = async (record: Order) => {
    const id = record.id;
    if (expandedKeys.includes(id)) { setExpandedKeys((p) => p.filter((k) => k !== id)); return; }
    setExpandedKeys((p) => [...p, id]);
    if (expandedItems[id] !== undefined) return;
    setExpandedItems((p) => ({ ...p, [id]: null }));
    try {
      const order = await ordersService.getById(id);
      setExpandedItems((p) => ({ ...p, [id]: order.items || [] }));
    } catch {
      setExpandedItems((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  };

  /* ── Export ─────────────────────────────────────────────── */
  const handleExport = async () => {
    setExporting(true);
    try {
      const orders = await ordersService.exportOrders({ statusIn, search, dateFrom, dateTo });
      const rows: Record<string, any>[] = [];
      for (const o of orders) {
        const base = {
          'Số Đơn': o.orderNumber, 'Mã CH': o.store?.code || '',
          'Tên CH': o.store?.name || '', 'Ngày Tạo': new Date(o.createdAt).toLocaleDateString('vi-VN'),
          'Trạng Thái': getOrderStatusLabel(o.status), 'Người Tạo': o.createdBy?.fullName || '',
          'Khách Cần Trả': o.totalAmount,
          'Khách Đã Trả': o.payment?.paidAmount || 0,
          'Còn Nợ': o.payment?.remainingAmount || 0,
        };
        if (o.items?.length) {
          for (const item of o.items) {
            rows.push({ ...base, 'Mã Hàng': item.product?.code || '', 'Tên Hàng': item.product?.name || '', 'ĐVT': item.product?.unit || '', 'SL': item.quantity, 'Đơn Giá': item.unitPrice, 'Thành Tiền': item.totalPrice });
          }
        } else { rows.push(base); }
      }
      exportToExcel(rows, `Don_Hang_${new Date().toISOString().slice(0, 10)}`, 'Đơn Hàng');
    } catch { message.error('Lỗi xuất Excel'); }
    finally { setExporting(false); }
  };

  /* ── Status tag toggle ──────────────────────────────────── */
  const toggleStatus = (val: string) => {
    setCheckedStatuses((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val],
    );
    setPage(1);
  };

  /* ── Table columns ──────────────────────────────────────── */
  const columns = [
    {
      title: 'Mã đặt hàng',
      key: 'orderNumber',
      width: 170,
      render: (_: any, record: Order) => (
        <div>
          <Button type="link" onClick={() => toggleExpand(record)} style={{ padding: 0, fontWeight: 600, fontSize: 12, display: 'block', height: 'auto', lineHeight: '20px', whiteSpace: 'nowrap' }}>
            {record.orderNumber}
          </Button>
          {record.invoiceNumber && (
            <Text type="secondary" style={{ fontSize: 11 }}>→ {record.invoiceNumber}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (d: string) => <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDateTime(d)}</Text>,
    },
    {
      title: 'Mã KH',
      key: 'storeCode',
      width: 190,
      render: (_: any, record: Order) => (
        <Text style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#1677ff' }}>{record.store?.code}</Text>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'storeName',
      ellipsis: true,
      render: (_: any, record: Order) => (
        <Text style={{ fontSize: 12 }}>{record.store?.name || record.store?.code}</Text>
      ),
    },
    {
      title: 'Khách cần trả',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Khách đã trả',
      key: 'paid',
      width: 115,
      align: 'right' as const,
      render: (_: any, record: Order) => {
        const paid = record.payment?.paidAmount || 0;
        return (
          <Text style={{ fontSize: 12, whiteSpace: 'nowrap', color: paid === 0 ? '#f5222d' : '#222' }}>
            {paid === 0 ? '0' : formatCurrency(paid)}
          </Text>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: OrderStatus) => (
        <Text strong style={{ color: STATUS_TEXT_COLOR[s] || '#666', fontSize: 12, whiteSpace: 'nowrap' }}>
          {getOrderStatusLabel(s)}
        </Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      render: (_: any, record: Order) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/orders/${record.id}`)} />
          </Tooltip>
          {canManage && record.status === 'DRAFT' && (
            <Tooltip title="Hoàn thành đơn">
              <Button size="small" type="primary" icon={<ToolOutlined />} onClick={() => navigate(`/orders/${record.id}`)} />
            </Tooltip>
          )}
          {isAdmin && (
            <Tooltip title="Xóa đơn hàng">
              <Popconfirm
                title="Xóa đơn hàng này?"
                onConfirm={() => deleteMutation.mutate(record.id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  /* ── Expanded row ───────────────────────────────────────── */
  const expandedRowRender = (record: Order) => {
    const items = expandedItems[record.id];
    if (items === null) return <div style={{ padding: '10px 16px' }}><Spin size="small" /> Đang tải...</div>;
    if (!items?.length) return <div style={{ padding: '10px 16px', color: '#999' }}>Không có sản phẩm</div>;
    return (
      <Table
        dataSource={items}
        rowKey="id"
        size="small"
        pagination={false}
        style={{ margin: '0 16px 12px' }}
        columns={[
          { title: '#', key: 'idx', width: 36, render: (_: any, __: any, i: number) => <Text type="secondary">{i + 1}</Text> },
          { title: 'Mã hàng', key: 'code', width: 110, render: (_: any, item: OrderItem) => <Text code style={{ fontSize: 12 }}>{(item as any).product?.code}</Text> },
          { title: 'Tên hàng', key: 'name', render: (_: any, item: OrderItem) => <Text strong>{(item as any).product?.name}</Text> },
          { title: 'ĐVT', key: 'unit', width: 60, render: (_: any, item: OrderItem) => (item as any).product?.unit },
          { title: 'SL', dataIndex: 'quantity', key: 'qty', width: 56, render: (q: number) => <Text strong>{q}</Text> },
          { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'price', width: 120, render: (p: number) => formatCurrency(p) },
          { title: 'Giảm giá', dataIndex: 'discount', key: 'disc', width: 110, render: (d: number) => d > 0 ? <Text type="danger">-{formatCurrency(d)}</Text> : <Text type="secondary">—</Text> },
          { title: 'Thành tiền', dataIndex: 'totalPrice', key: 'total', width: 130, render: (p: number) => <Text strong style={{ color: '#52c41a' }}>{formatCurrency(p)}</Text> },
        ]}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={7} align="right"><Text strong>Tổng cộng</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={1}><Text strong style={{ color: '#52c41a' }}>{formatCurrency(record.totalAmount)}</Text></Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    );
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: '#f5f5f5', margin: -24, overflow: 'hidden' }}>

      {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
      <div style={{
        width: 220, background: '#fff', borderRight: '1px solid #e8e8e8',
        overflowY: 'auto', padding: '16px 14px', flexShrink: 0,
      }}>

        {/* Thời gian */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Thời gian</Text>
          <Radio.Group
            value={timeMode}
            onChange={(e) => { setTimeMode(e.target.value); setPage(1); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <Radio value="month" style={{ fontSize: 13 }}>Tháng này</Radio>
            <Radio value="custom" style={{ fontSize: 13 }}>Tùy chỉnh</Radio>
          </Radio.Group>
          {timeMode === 'custom' && (
            <RangePicker
              style={{ width: '100%', marginTop: 8 }}
              size="small"
              value={dateRange}
              onChange={(d) => { setDateRange(d as any); setPage(1); }}
              format="DD/MM/YYYY"
              presets={[
                { label: 'Hôm nay', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
                { label: 'Hôm qua', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
                { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
                { label: 'Tuần trước', value: [dayjs().subtract(1, 'week').startOf('week'), dayjs().subtract(1, 'week').endOf('week')] },
                { label: 'Tháng trước', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
              ]}
            />
          )}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Trạng thái — tags with X (like KiotViet) */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Trạng thái</Text>

          {/* Selected tags row */}
          {checkedStatuses.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {checkedStatuses.map((s) => (
                <Tag
                  key={s}
                  color={getOrderStatusColor(s as OrderStatus)}
                  closable
                  onClose={() => toggleStatus(s)}
                  style={{ fontSize: 12, margin: 0 }}
                >
                  {getOrderStatusLabel(s as OrderStatus)}
                </Tag>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ALL_STATUSES.map(({ value, label }) => (
              <Checkbox
                key={value}
                checked={checkedStatuses.includes(value)}
                onChange={() => toggleStatus(value)}
                style={{ fontSize: 13 }}
              >
                {label}
              </Checkbox>
            ))}
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Người tạo (admin only) */}
        {isAdmin && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Người tạo</Text>
            <Select placeholder="Chọn người tạo" style={{ width: '100%' }} size="small" allowClear />
          </div>
        )}
      </div>

      {/* ── RIGHT MAIN ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #e8e8e8',
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#aaa' }} />}
            suffix={<FilterOutlined style={{ color: '#aaa' }} />}
            placeholder="Theo mã phiếu đặt, cửa hàng..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
            style={{ width: 300 }}
          />

          <div style={{ flex: 1 }} />

          {(isStoreOwner || isAdmin || isWarehouse) && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/sell')}
              style={{ fontWeight: 600 }}
            >
              Đặt hàng
            </Button>
          )}

          {isAdmin && (
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exporting}
            >
              Xuất file
            </Button>
          )}

          <Tooltip title="Xuất Excel">
            <Button icon={<FileExcelOutlined />} onClick={handleExport} loading={exporting} />
          </Tooltip>
        </div>

        {/* Summary row */}
        {(data?.meta.total || 0) > 0 && (
          <div style={{
            background: '#fff', borderBottom: '1px solid #f0f0f0',
            padding: '7px 16px', display: 'flex', gap: 24, flexShrink: 0, flexWrap: 'nowrap', alignItems: 'center',
          }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tổng <Text strong>{data?.meta.total}</Text> đơn hàng
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Khách cần trả: <Text strong>{formatCurrency(summaryNeed)}</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Khách đã trả: <Text strong style={{ color: summaryPaid < summaryNeed ? '#f5222d' : '#52c41a' }}>
                {formatCurrency(summaryPaid)}
              </Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Còn nợ: <Text strong style={{ color: '#f5222d' }}>
                {formatCurrency(summaryNeed - summaryPaid)}
              </Text>
            </Text>
          </div>
        )}

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            columns={columns}
            dataSource={data?.data || []}
            rowKey="id"
            loading={isLoading}
            size="small"
            scroll={{ x: 'max-content' }}
            sticky
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys as string[]),
            }}
            expandable={{
              expandedRowKeys: expandedKeys,
              onExpand: (_, record) => toggleExpand(record),
              expandedRowRender,
            }}
            pagination={{
              current: page,
              pageSize: 20,
              total: data?.meta.total || 0,
              onChange: setPage,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} đơn hàng`,
              style: { padding: '8px 16px' },
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default OrdersPage;
