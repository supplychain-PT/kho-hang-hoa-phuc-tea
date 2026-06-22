import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Tag, Typography, DatePicker,
  message, Popconfirm, Input, Tooltip, Spin,
  Checkbox, Radio, Space, Divider, Select, Modal,
} from 'antd';
import {
  SearchOutlined, EyeOutlined, CopyOutlined, StopOutlined,
  FileExcelOutlined, PlusOutlined, DownloadOutlined, FilterOutlined, DeleteOutlined,
  PrinterOutlined, RollbackOutlined, QrcodeOutlined, EditOutlined,
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import dayjs from 'dayjs';
import { ordersService } from '../services/orders.service';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDateTime, getOrderStatusLabel, getOrderStatusColor } from '../utils/format';
import { exportToExcel } from '../utils/exportExcel';
import { Order, OrderStatus, OrderItem } from '../types';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const INVOICE_STATUSES = ['COMPLETED'];

const STATUS_OPTIONS = [
  { value: 'COMPLETED', label: 'Hoàn thành' },
];

function InvoicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const isAdmin = user?.role === 'ADMIN';

  /* ── Filter state ───────────────────────────────────────── */
  const [search, setSearch] = useState('');
  const [timeMode, setTimeMode] = useState<'month' | 'custom'>('month');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [checkedStatuses, setCheckedStatuses] = useState<string[]>([]);   // empty = all invoice statuses
  const [page, setPage] = useState(1);

  /* ── Expand & selection ─────────────────────────────────── */
  const [expandedItems, setExpandedItems] = useState<Record<string, OrderItem[] | null>>({});
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [qrRecord, setQrRecord] = useState<Order | null>(null);

  /* ── Computed query params ──────────────────────────────── */
  const effectiveStatuses = checkedStatuses.length > 0 ? checkedStatuses : INVOICE_STATUSES;

  const dateFrom = useMemo(() => {
    if (timeMode === 'month') return dayjs().startOf('month').format('YYYY-MM-DD');
    return dateRange?.[0]?.format('YYYY-MM-DD');
  }, [timeMode, dateRange]);

  const dateTo = useMemo(() => {
    if (timeMode === 'month') return dayjs().endOf('month').format('YYYY-MM-DD');
    return dateRange?.[1]?.format('YYYY-MM-DD');
  }, [timeMode, dateRange]);

  const queryParams = {
    page,
    limit: 20,
    search,
    statusIn: effectiveStatuses.join(','),
    dateFrom,
    dateTo,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', queryParams],
    queryFn: () => ordersService.getAll(queryParams),
    placeholderData: (prev: any) => prev,
  });

  /* ── Totals summary row ─────────────────────────────────── */
  const summaryTotal = useMemo(() =>
    (data?.data || []).reduce((s: number, o: Order) => s + o.totalAmount, 0),
    [data],
  );
  const summaryDiscount = useMemo(() =>
    (data?.data || []).reduce((s: number, o: Order) => s + (o.discount || 0), 0),
    [data],
  );

  /* ── Mutations ──────────────────────────────────────────── */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const deleteMutation = useMutation({
    mutationFn: ordersService.deleteOrder,
    onSuccess: () => { message.success('Đã xóa hóa đơn'); invalidate(); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Lỗi xóa đơn'),
  });

  const copyMutation = useMutation({
    mutationFn: async (record: Order) => {
      // Lấy items nếu chưa load
      let items = expandedItems[record.id];
      if (!items) {
        const full = await ordersService.getById(record.id);
        items = full.items || [];
      }
      const storeId = record.store?.id || (record as any).storeId;
      return ordersService.create({
        storeId,
        items: items.map((i: any) => ({
          productId: i.product?.id || i.productId,
          quantity: i.quantity,
        })),
      });
    },
    onSuccess: (order) => {
      message.success(`Đã sao chép thành phiếu tạm ${order.orderNumber}`);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Lỗi sao chép'),
  });

  /* ── In hóa đơn ─────────────────────────────────────────── */
  const printInvoice = async (record: Order) => {
    let items = expandedItems[record.id];
    if (!items) {
      try {
        const full = await ordersService.getById(record.id);
        items = full.items || [];
      } catch { items = []; }
    }
    const win = window.open('', '_blank', 'width=700,height=900');
    if (!win) return;
    const rows = (items as any[]).map((i, idx) => `
      <tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${idx + 1}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${i.product?.code || ''}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee">${i.product?.name || ''}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${i.unitPrice?.toLocaleString('vi-VN')} đ</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right">${i.totalPrice?.toLocaleString('vi-VN')} đ</td>
      </tr>`).join('');
    win.document.write(`
      <!DOCTYPE html><html><head>
        <meta charset="utf-8"/><title>Hóa đơn ${record.invoiceNumber || record.orderNumber}</title>
        <style>body{font-family:Arial,sans-serif;padding:24px;font-size:13px}
          h2{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:12px}
          th{background:#f5f5f5;padding:6px 8px;border-bottom:2px solid #ddd;text-align:left}
          .total{font-weight:700;font-size:15px;color:#1677ff}</style>
      </head><body>
        <div style="text-align:center;margin-bottom:16px">
          <h2>PHÚC TEA | THE HOA</h2>
          <div style="color:#888;font-size:12px">HÓA ĐƠN BÁN HÀNG</div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <div><b>Mã HĐ:</b> ${record.invoiceNumber || record.orderNumber}</div>
          <div><b>Ngày:</b> ${new Date(record.completedAt || record.createdAt).toLocaleString('vi-VN')}</div>
        </div>
        <div><b>Khách hàng:</b> ${record.store?.name || ''} (${record.store?.code || ''})</div>
        <table>
          <thead><tr>
            <th style="width:36px">#</th><th>Mã</th><th>Tên hàng</th>
            <th style="text-align:center">SL</th>
            <th style="text-align:right">Đơn giá</th>
            <th style="text-align:right">Thành tiền</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>
            <td colspan="5" style="padding:8px;text-align:right;font-weight:700">Tổng cộng</td>
            <td style="padding:8px;text-align:right" class="total">${record.totalAmount?.toLocaleString('vi-VN')} đ</td>
          </tr></tfoot>
        </table>
        <div style="margin-top:24px;text-align:center;color:#aaa;font-size:11px">Cảm ơn quý khách!</div>
        <script>window.onload=()=>{window.print();window.close()}<\/script>
      </body></html>`);
    win.document.close();
  };

  /* ── Xuất Excel đơn lẻ ──────────────────────────────────── */
  const exportSingleInvoice = async (record: Order) => {
    let items = expandedItems[record.id];
    if (!items) {
      try {
        const full = await ordersService.getById(record.id);
        items = full.items || [];
      } catch { items = []; }
    }
    const rows = (items as any[]).map((i) => ({
      'Mã HĐ': record.invoiceNumber || record.orderNumber,
      'Khách hàng': record.store?.name || '',
      'Mã KH': record.store?.code || '',
      'Ngày': new Date(record.completedAt || record.createdAt).toLocaleDateString('vi-VN'),
      'Mã hàng': i.product?.code || '',
      'Tên hàng': i.product?.name || '',
      'ĐVT': i.product?.unit || '',
      'SL': i.quantity,
      'Đơn giá': i.unitPrice,
      'Giảm giá': i.discount || 0,
      'Thành tiền': i.totalPrice,
    }));
    if (rows.length === 0) rows.push({
      'Mã HĐ': record.invoiceNumber || record.orderNumber,
      'Khách hàng': record.store?.name || '', 'Mã KH': record.store?.code || '',
      'Ngày': '', 'Mã hàng': '', 'Tên hàng': '', 'ĐVT': '', 'SL': 0, 'Đơn giá': 0, 'Giảm giá': 0, 'Thành tiền': 0,
    });
    exportToExcel(rows, `HoaDon_${record.invoiceNumber || record.orderNumber}`, 'Hóa Đơn');
  };

  /* ── Expand ─────────────────────────────────────────────── */
  const toggleExpand = async (record: Order) => {
    const id = record.id;
    if (expandedKeys.includes(id)) {
      setExpandedKeys((p) => p.filter((k) => k !== id));
      return;
    }
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
      let orders: any[];
      if (selectedRowKeys.length > 0) {
        orders = (data?.data || []).filter((o: Order) => selectedRowKeys.includes(o.id));
        await Promise.all(orders.map(async (o: any) => {
          if (!expandedItems[o.id]) {
            try { const f = await ordersService.getById(o.id); o.items = f.items; } catch { /* */ }
          } else { o.items = expandedItems[o.id]; }
        }));
      } else {
        orders = await ordersService.exportOrders({ statusIn: effectiveStatuses.join(','), search, dateFrom, dateTo });
      }
      const rows: Record<string, any>[] = [];
      for (const o of orders) {
        if (o.items?.length) {
          for (const item of o.items) {
            rows.push({
              'Mã Hóa Đơn': o.orderNumber,
              'Mã CH': o.store?.code || '',
              'Tên CH': o.store?.name || '',
              'Ngày Duyệt': o.approvedAt ? new Date(o.approvedAt).toLocaleDateString('vi-VN') : '',
              'Trạng Thái': getOrderStatusLabel(o.status),
              'Mã Hàng': item.product?.code || '',
              'Tên Hàng': item.product?.name || '',
              'ĐVT': item.product?.unit || '',
              'SL': item.quantity,
              'Đơn Giá': item.unitPrice,
              'Giảm Giá': item.discount || 0,
              'Thành Tiền': item.totalPrice,
              'Tổng Đơn': o.totalAmount,
              'Còn Nợ': o.payment?.remainingAmount || 0,
            });
          }
        } else {
          rows.push({
            'Mã Hóa Đơn': o.orderNumber, 'Mã CH': o.store?.code || '',
            'Tên CH': o.store?.name || '', 'Ngày Duyệt': '',
            'Trạng Thái': getOrderStatusLabel(o.status),
            'Mã Hàng': '', 'Tên Hàng': '', 'ĐVT': '', 'SL': '', 'Đơn Giá': '',
            'Giảm Giá': '', 'Thành Tiền': '', 'Tổng Đơn': o.totalAmount,
            'Còn Nợ': o.payment?.remainingAmount || 0,
          });
        }
      }
      exportToExcel(rows, `Hoa_Don_${new Date().toISOString().slice(0, 10)}`, 'Hóa Đơn');
    } catch { message.error('Lỗi xuất Excel'); }
    finally { setExporting(false); }
  };

  /* ── Table columns ──────────────────────────────────────── */
  const columns = [
    {
      title: 'Mã hóa đơn',
      key: 'invoiceNumber',
      width: 150,
      render: (_: any, record: Order) => (
        <Button type="link" onClick={() => toggleExpand(record)} style={{ padding: 0, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
          {record.invoiceNumber || record.orderNumber}
        </Button>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'approvedAt',
      key: 'approvedAt',
      width: 130,
      render: (d: string, record: Order) =>
        <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDateTime(d || record.createdAt)}</Text>,
    },
    {
      title: 'Mã KH',
      key: 'storeCode',
      width: 180,
      render: (_: any, record: Order) =>
        <Text style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#1677ff' }}>{record.store?.code}</Text>,
    },
    {
      title: 'Khách hàng',
      key: 'storeName',
      ellipsis: true,
      render: (_: any, record: Order) =>
        <Text style={{ fontSize: 12 }}>{record.store?.name || record.store?.code}</Text>,
    },
    {
      title: 'Tổng tiền hàng',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Giảm giá',
      dataIndex: 'discount',
      key: 'discount',
      width: 90,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{v ? formatCurrency(v) : 0}</Text>,
    },
    {
      title: 'Tổng sau giảm',
      key: 'net',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: Order) => (
        <Text strong style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatCurrency(record.totalAmount - (record.discount || 0))}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 105,
      render: (s: OrderStatus) =>
        <Tag color={getOrderStatusColor(s)} style={{ fontSize: 11 }}>{getOrderStatusLabel(s)}</Tag>,
    },
  ];

  /* ── Expanded row ───────────────────────────────────────── */
  const expandedRowRender = (record: Order) => {
    const items = expandedItems[record.id];
    if (items === null) return <div style={{ padding: '10px 16px' }}><Spin size="small" /> Đang tải...</div>;
    if (!items?.length) return <div style={{ padding: '10px 16px', color: '#999' }}>Không có sản phẩm</div>;
    return (
      <div style={{ margin: '0 16px 0' }}>
        <Table
          dataSource={items}
          rowKey="id"
          size="small"
          pagination={false}
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

        {/* ── Action bar dưới mỗi hóa đơn ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 0 10px', borderTop: '1px solid #f0f0f0', marginTop: 2,
        }}>
          {/* === TRÁI === */}
          {isAdmin && (
            <Popconfirm
              title="Hủy hóa đơn này?"
              description="Hóa đơn sẽ bị xóa và tồn kho được hoàn lại."
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Xác nhận hủy"
              cancelText="Không"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" icon={<StopOutlined />} danger>Hủy</Button>
            </Popconfirm>
          )}

          <Button
            size="small"
            icon={<CopyOutlined />}
            loading={copyMutation.isPending}
            onClick={() => copyMutation.mutate(record)}
          >
            Sao chép
          </Button>

          <Button
            size="small"
            icon={<FileExcelOutlined />}
            onClick={() => exportSingleInvoice(record)}
          >
            Xuất file
          </Button>

          <div style={{ flex: 1 }} />

          {/* === PHẢI === */}
          <Button
            size="small"
            icon={<EditOutlined />}
            type="primary"
            onClick={() => navigate(`/orders/${record.id}`)}
          >
            Chỉnh sửa
          </Button>

          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => printInvoice(record)}
          >
            In
          </Button>

          <Tooltip title="Tính năng đang phát triển">
            <Button
              size="small"
              icon={<RollbackOutlined />}
              onClick={() => message.info('Tính năng trả hàng đang phát triển')}
            >
              Trả hàng
            </Button>
          </Tooltip>

          <Button
            size="small"
            icon={<QrcodeOutlined />}
            onClick={() => setQrRecord(record)}
          >
            Tạo QR
          </Button>
        </div>
      </div>
    );
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <>
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
            onChange={(e) => setTimeMode(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <Radio value="month" style={{ fontSize: 13 }}>
              Tháng này
              {timeMode === 'month' && (
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>›</Text>
              )}
            </Radio>
            <Radio value="custom" style={{ fontSize: 13 }}>Tùy chỉnh</Radio>
          </Radio.Group>
          {timeMode === 'custom' && (
            <RangePicker
              style={{ width: '100%', marginTop: 8 }}
              size="small"
              value={dateRange}
              onChange={(d) => { setDateRange(d as any); setPage(1); }}
              presets={[
                { label: 'Hôm nay', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
                { label: 'Hôm qua', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
                { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
                { label: 'Tuần trước', value: [dayjs().subtract(1, 'week').startOf('week'), dayjs().subtract(1, 'week').endOf('week')] },
                { label: 'Tháng trước', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
              ]}
              format="DD/MM/YYYY"
            />
          )}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Trạng thái */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Trạng thái</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STATUS_OPTIONS.map(({ value, label }) => (
              <Checkbox
                key={value}
                checked={checkedStatuses.includes(value)}
                onChange={(e) => {
                  setCheckedStatuses((prev) =>
                    e.target.checked ? [...prev, value] : prev.filter((s) => s !== value),
                  );
                  setPage(1);
                }}
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
            placeholder="Theo mã hóa đơn, cửa hàng..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
            style={{ width: 280 }}
          />

          <div style={{ flex: 1 }} />

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/sell')}
            style={{ fontWeight: 600 }}
          >
            Hoá đơn
          </Button>

          {isAdmin && (
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exporting}
              style={{ color: '#52c41a', borderColor: '#52c41a' }}
            >
              {selectedRowKeys.length > 0 ? `Xuất ${selectedRowKeys.length} đơn` : 'Xuất file'}
            </Button>
          )}

          <Tooltip title="Xuất Excel chi tiết">
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
              Tổng <Text strong style={{ color: '#222' }}>{data?.meta.total}</Text> hóa đơn
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tổng tiền hàng: <Text strong style={{ color: '#222' }}>{formatCurrency(summaryTotal)}</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Giảm giá: <Text strong style={{ color: '#222' }}>{formatCurrency(summaryDiscount)}</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Sau giảm: <Text strong style={{ color: '#1677ff' }}>{formatCurrency(summaryTotal - summaryDiscount)}</Text>
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
              showTotal: (total) => `Tổng ${total} hóa đơn`,
              style: { padding: '8px 16px' },
            }}
          />
        </div>
      </div>
    </div>

    {/* ── QR Code Modal ─────────────────────────────────────── */}
    <Modal
      title={`QR Hóa đơn — ${qrRecord?.invoiceNumber || qrRecord?.orderNumber || ''}`}
      open={!!qrRecord}
      onCancel={() => setQrRecord(null)}
      footer={[
        <Button key="print" icon={<PrinterOutlined />} onClick={() => { if (qrRecord) printInvoice(qrRecord); }}>In hóa đơn</Button>,
        <Button key="close" type="primary" onClick={() => setQrRecord(null)}>Đóng</Button>,
      ]}
      centered
      width={320}
    >
      {qrRecord && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <QRCodeSVG
            value={JSON.stringify({
              id: qrRecord.invoiceNumber || qrRecord.orderNumber,
              store: qrRecord.store?.code,
              total: qrRecord.totalAmount,
            })}
            size={220}
            level="M"
            style={{ border: '1px solid #f0f0f0', padding: 8, borderRadius: 8 }}
          />
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1677ff' }}>
              {qrRecord.invoiceNumber || qrRecord.orderNumber}
            </div>
            <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
              {qrRecord.store?.name} · {formatCurrency(qrRecord.totalAmount)}
            </div>
          </div>
        </div>
      )}
    </Modal>
    </>
  );
}

export default InvoicesPage;
