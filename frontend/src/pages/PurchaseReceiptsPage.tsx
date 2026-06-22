import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Tag, Typography, DatePicker,
  message, Popconfirm, Input, Spin,
  Checkbox, Radio, Divider, Modal, InputNumber,
  AutoComplete, Space,
} from 'antd';
import {
  SearchOutlined, CheckCircleOutlined, PlusOutlined, DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { purchaseReceiptsService } from '../services/purchaseReceipts.service';
import { productsService } from '../services/products.service';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDateTime } from '../utils/format';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const normalize = (s: string) => s.toLowerCase().normalize('NFC');

interface CartItem {
  productId: string;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  costPrice: number;
}

interface ReceiptRecord {
  id: string;
  receiptNumber: string;
  status: string;
  totalAmount: number;
  note?: string;
  createdAt: string;
  completedAt?: string;
  createdBy: { id: string; fullName: string };
  _count?: { items: number };
  items?: ReceiptItemRecord[];
}

interface ReceiptItemRecord {
  id: string;
  quantity: number;
  costPrice: number;
  totalPrice: number;
  product: { id: string; code: string; name: string; unit: string; stock: number };
}

function PurchaseReceiptsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const isAdmin = user?.role === 'ADMIN';
  const isWarehouse = user?.role === 'WAREHOUSE_STAFF';

  /* ── Filter state ─────────────────────────────────────────── */
  const [search, setSearch] = useState('');
  const [timeMode, setTimeMode] = useState<'month' | 'custom'>('month');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [checkedStatuses, setCheckedStatuses] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  /* ── Expand & selection ───────────────────────────────────── */
  const [expandedItems, setExpandedItems] = useState<Record<string, ReceiptItemRecord[] | null>>({});
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  /* ── Modal state ──────────────────────────────────────────── */
  const [modalOpen, setModalOpen] = useState(false);
  const [note, setNote] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const productSearchRef = useRef<string>('');

  /* ── Date range computation ───────────────────────────────── */
  const dateFrom = useMemo(() => {
    if (timeMode === 'month') return dayjs().startOf('month').format('YYYY-MM-DD');
    return dateRange?.[0]?.format('YYYY-MM-DD');
  }, [timeMode, dateRange]);

  const dateTo = useMemo(() => {
    if (timeMode === 'month') return dayjs().endOf('month').format('YYYY-MM-DD');
    return dateRange?.[1]?.format('YYYY-MM-DD');
  }, [timeMode, dateRange]);

  /* ── Query: receipt list ──────────────────────────────────── */
  const statusFilter = checkedStatuses.length === 1 ? checkedStatuses[0] : undefined;

  const queryParams = {
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter,
    dateFrom,
    dateTo,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-receipts', queryParams],
    queryFn: () => purchaseReceiptsService.getAll(queryParams),
    placeholderData: (prev: any) => prev,
  });

  /* ── Query: products for modal ────────────────────────────── */
  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsService.getAll({ limit: 500, isActive: true }),
    staleTime: 5 * 60 * 1000,
  });

  const allProducts = productsData?.data || [];

  /* ── Filtered autocomplete options ───────────────────────── */
  const autoCompleteOptions = useMemo(() => {
    const term = normalize(productSearchRef.current);
    if (!term) return [];
    return allProducts
      .filter((p: any) =>
        normalize(p.name).includes(term) ||
        normalize(p.code).includes(term)
      )
      .slice(0, 20)
      .map((p: any) => ({
        value: p.id,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              <Text code style={{ fontSize: 11 }}>{p.code}</Text>
              {' '}
              <span>{p.name}</span>
            </span>
            <span style={{ color: '#999', fontSize: 11 }}>
              Tồn: {p.stock} {p.unit}
            </span>
          </div>
        ),
        product: p,
      }));
  }, [allProducts, productSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Summary ──────────────────────────────────────────────── */
  const summaryTotal = useMemo(
    () => (data?.data || []).reduce((s: number, r: ReceiptRecord) => s + r.totalAmount, 0),
    [data],
  );

  /* ── Mutations ────────────────────────────────────────────── */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['purchase-receipts'] });
    queryClient.invalidateQueries({ queryKey: ['products-all'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: purchaseReceiptsService.create,
    onSuccess: () => {
      message.success('Đã tạo phiếu nhập');
      setModalOpen(false);
      setCart([]);
      setNote('');
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Lỗi tạo phiếu'),
  });

  const completeMutation = useMutation({
    mutationFn: purchaseReceiptsService.complete,
    onSuccess: () => {
      message.success('Đã duyệt phiếu nhập — tồn kho đã cập nhật');
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Lỗi duyệt phiếu'),
  });

  const deleteMutation = useMutation({
    mutationFn: purchaseReceiptsService.remove,
    onSuccess: () => {
      message.success('Đã xóa phiếu nhập');
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Lỗi xóa phiếu'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await purchaseReceiptsService.remove(id);
    },
    onSuccess: () => {
      message.success('Đã xóa các phiếu nhập đã chọn');
      setSelectedRowKeys([]);
      invalidate();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Lỗi xóa phiếu'),
  });

  /* ── Expand rows ──────────────────────────────────────────── */
  const toggleExpand = async (record: ReceiptRecord) => {
    const id = record.id;
    if (expandedKeys.includes(id)) {
      setExpandedKeys((p) => p.filter((k) => k !== id));
      return;
    }
    setExpandedKeys((p) => [...p, id]);
    if (expandedItems[id] !== undefined) return;
    setExpandedItems((p) => ({ ...p, [id]: null }));
    try {
      const full = await purchaseReceiptsService.getById(id);
      setExpandedItems((p) => ({ ...p, [id]: full.items || [] }));
    } catch {
      setExpandedItems((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    }
  };

  /* ── Cart helpers ─────────────────────────────────────────── */
  const addProductToCart = (product: any) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.productId === product.id);
      if (exists) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          code: product.code,
          name: product.name,
          unit: product.unit,
          quantity: 1,
          costPrice: product.costPrice || 0,
        },
      ];
    });
    setProductSearch('');
    productSearchRef.current = '';
  };

  const updateCartItem = (productId: string, field: 'quantity' | 'costPrice', value: number) => {
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, [field]: value } : i)),
    );
  };

  const removeCartItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const cartTotal = cart.reduce((s, i) => s + i.quantity * i.costPrice, 0);

  const handleSave = () => {
    if (cart.length === 0) {
      message.warning('Phiếu nhập phải có ít nhất 1 sản phẩm');
      return;
    }
    createMutation.mutate({
      note: note || undefined,
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        costPrice: i.costPrice,
      })),
    });
  };

  /* ── Table columns ────────────────────────────────────────── */
  const columns = [
    {
      title: 'Mã phiếu nhập',
      key: 'receiptNumber',
      width: 140,
      render: (_: any, record: ReceiptRecord) => (
        <Button
          type="link"
          onClick={() => toggleExpand(record)}
          style={{ padding: 0, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}
        >
          {record.receiptNumber}
        </Button>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (d: string) => (
        <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDateTime(d)}</Text>
      ),
    },
    {
      title: 'Người tạo',
      key: 'createdBy',
      width: 140,
      render: (_: any, record: ReceiptRecord) => (
        <Text style={{ fontSize: 12 }}>{record.createdBy?.fullName}</Text>
      ),
    },
    {
      title: 'Số mặt hàng',
      key: 'itemCount',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: ReceiptRecord) => record._count?.items ?? 0,
    },
    {
      title: 'Tổng tiền nhập',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 130,
      align: 'right' as const,
      render: (v: number) => (
        <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatCurrency(v)}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) =>
        s === 'COMPLETED' ? (
          <Tag color="green" style={{ fontSize: 11 }}>Hoàn thành</Tag>
        ) : (
          <Tag style={{ fontSize: 11 }}>Phiếu tạm</Tag>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 110,
      render: (_: any, record: ReceiptRecord) => (
        <Space size={4}>
          {record.status === 'DRAFT' && (isAdmin || isWarehouse) && (
            <Popconfirm
              title="Duyệt phiếu nhập hàng?"
              onConfirm={() => completeMutation.mutate(record.id)}
              okText="Duyệt"
              cancelText="Hủy"
            >
              <Button
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ color: '#52c41a', borderColor: '#52c41a' }}
                loading={completeMutation.isPending}
              >
                Duyệt nhập
              </Button>
            </Popconfirm>
          )}
          {record.status === 'DRAFT' && isAdmin && (
            <Popconfirm
              title="Xóa phiếu nhập?"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  /* ── Expanded row render ──────────────────────────────────── */
  const expandedRowRender = (record: ReceiptRecord) => {
    const items = expandedItems[record.id];
    if (items === null)
      return (
        <div style={{ padding: '10px 16px' }}>
          <Spin size="small" /> Đang tải...
        </div>
      );
    if (!items?.length)
      return <div style={{ padding: '10px 16px', color: '#999' }}>Không có sản phẩm</div>;
    return (
      <Table
        dataSource={items}
        rowKey="id"
        size="small"
        pagination={false}
        style={{ margin: '0 16px 12px' }}
        columns={[
          {
            title: '#',
            key: 'idx',
            width: 36,
            render: (_: any, __: any, i: number) => (
              <Text type="secondary">{i + 1}</Text>
            ),
          },
          {
            title: 'Mã hàng',
            key: 'code',
            width: 110,
            render: (_: any, item: ReceiptItemRecord) => (
              <Text code style={{ fontSize: 12 }}>{item.product?.code}</Text>
            ),
          },
          {
            title: 'Tên hàng',
            key: 'name',
            render: (_: any, item: ReceiptItemRecord) => (
              <Text strong>{item.product?.name}</Text>
            ),
          },
          {
            title: 'ĐVT',
            key: 'unit',
            width: 60,
            render: (_: any, item: ReceiptItemRecord) => item.product?.unit,
          },
          {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'qty',
            width: 80,
            render: (q: number) => <Text strong>{q}</Text>,
          },
          {
            title: 'Giá nhập',
            dataIndex: 'costPrice',
            key: 'costPrice',
            width: 120,
            render: (p: number) => formatCurrency(p),
          },
          {
            title: 'Thành tiền',
            dataIndex: 'totalPrice',
            key: 'total',
            width: 130,
            render: (p: number) => (
              <Text strong style={{ color: '#52c41a' }}>{formatCurrency(p)}</Text>
            ),
          },
        ]}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={6} align="right">
              <Text strong>Tổng cộng</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1}>
              <Text strong style={{ color: '#52c41a' }}>{formatCurrency(record.totalAmount)}</Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    );
  };

  /* ── Cart table columns ───────────────────────────────────── */
  const cartColumns = [
    {
      title: '#',
      key: 'idx',
      width: 36,
      render: (_: any, __: any, i: number) => i + 1,
    },
    {
      title: 'Mã hàng',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
    },
    {
      title: 'Tên hàng',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'ĐVT',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
    },
    {
      title: 'Số lượng',
      key: 'quantity',
      width: 100,
      render: (_: any, item: CartItem) => (
        <InputNumber
          min={1}
          value={item.quantity}
          onChange={(v) => updateCartItem(item.productId, 'quantity', v || 1)}
          style={{ width: 80 }}
          size="small"
        />
      ),
    },
    {
      title: 'Giá nhập',
      key: 'costPrice',
      width: 130,
      render: (_: any, item: CartItem) => (
        <InputNumber
          min={0}
          value={item.costPrice}
          onChange={(v) => updateCartItem(item.productId, 'costPrice', v || 0)}
          style={{ width: 110 }}
          size="small"
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={(v) => Number((v || '').replace(/\./g, ''))}
        />
      ),
    },
    {
      title: 'Thành tiền',
      key: 'total',
      width: 120,
      render: (_: any, item: CartItem) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatCurrency(item.quantity * item.costPrice)}
        </Text>
      ),
    },
    {
      title: '',
      key: 'del',
      width: 40,
      render: (_: any, item: CartItem) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeCartItem(item.productId)}
        />
      ),
    },
  ];

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 64px)',
        background: '#f5f5f5',
        margin: -24,
        overflow: 'hidden',
      }}
    >
      {/* LEFT SIDEBAR */}
      <div
        style={{
          width: 220,
          background: '#fff',
          borderRight: '1px solid #e8e8e8',
          overflowY: 'auto',
          padding: '16px 14px',
          flexShrink: 0,
        }}
      >
        {/* Thời gian */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Thời gian
          </Text>
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
              presets={[
                {
                  label: 'Hôm nay',
                  value: [dayjs().startOf('day'), dayjs().endOf('day')],
                },
                {
                  label: 'Hôm qua',
                  value: [
                    dayjs().subtract(1, 'day').startOf('day'),
                    dayjs().subtract(1, 'day').endOf('day'),
                  ],
                },
                {
                  label: 'Tuần này',
                  value: [dayjs().startOf('week'), dayjs().endOf('week')],
                },
                {
                  label: 'Tuần trước',
                  value: [
                    dayjs().subtract(1, 'week').startOf('week'),
                    dayjs().subtract(1, 'week').endOf('week'),
                  ],
                },
                {
                  label: 'Tháng trước',
                  value: [
                    dayjs().subtract(1, 'month').startOf('month'),
                    dayjs().subtract(1, 'month').endOf('month'),
                  ],
                },
              ]}
              format="DD/MM/YYYY"
            />
          )}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Trạng thái */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Trạng thái
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { value: 'DRAFT', label: 'Phiếu tạm' },
              { value: 'COMPLETED', label: 'Hoàn thành' },
            ].map(({ value, label }) => (
              <Checkbox
                key={value}
                checked={checkedStatuses.includes(value)}
                onChange={(e) => {
                  setCheckedStatuses((prev) =>
                    e.target.checked
                      ? [...prev, value]
                      : prev.filter((s) => s !== value),
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
      </div>

      {/* RIGHT MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid #e8e8e8',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Input
            prefix={<SearchOutlined style={{ color: '#aaa' }} />}
            placeholder="Theo mã phiếu nhập..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
            style={{ width: 280 }}
          />

          <div style={{ flex: 1 }} />

          {selectedRowKeys.length > 0 && isAdmin && (
            <Popconfirm
              title={`Xóa ${selectedRowKeys.length} phiếu đã chọn?`}
              onConfirm={() => bulkDeleteMutation.mutate(selectedRowKeys)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} loading={bulkDeleteMutation.isPending}>
                Xóa ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}

          {(isAdmin || isWarehouse) && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setCart([]);
                setNote('');
                setProductSearch('');
                setModalOpen(true);
              }}
              style={{ fontWeight: 600 }}
            >
              Nhập hàng
            </Button>
          )}
        </div>

        {/* Summary row */}
        {(data?.meta?.total || 0) > 0 && (
          <div
            style={{
              background: '#fff',
              borderBottom: '1px solid #f0f0f0',
              padding: '7px 16px',
              display: 'flex',
              gap: 24,
              flexShrink: 0,
              alignItems: 'center',
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tổng{' '}
              <Text strong style={{ color: '#222' }}>
                {data?.meta?.total}
              </Text>{' '}
              phiếu
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tổng tiền nhập:{' '}
              <Text strong style={{ color: '#222' }}>
                {formatCurrency(summaryTotal)}
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
              total: data?.meta?.total || 0,
              onChange: setPage,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} phiếu`,
              style: { padding: '8px 16px' },
            }}
          />
        </div>
      </div>

      {/* CREATE MODAL */}
      <Modal
        title="Tạo phiếu nhập hàng"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            Hủy
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={createMutation.isPending}
            onClick={handleSave}
            disabled={cart.length === 0}
          >
            Lưu phiếu tạm
          </Button>,
        ]}
        destroyOnClose
      >
        {/* Note */}
        <div style={{ marginBottom: 12 }}>
          <Input
            placeholder="Ghi chú phiếu nhập..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Product search */}
        <div style={{ marginBottom: 12 }}>
          <AutoComplete
            style={{ width: '100%' }}
            options={autoCompleteOptions}
            value={productSearch}
            onChange={(val) => {
              setProductSearch(val);
              productSearchRef.current = val;
            }}
            onSelect={(_val, option: any) => {
              addProductToCart(option.product);
            }}
            placeholder="Tìm sản phẩm theo mã hoặc tên để thêm..."
            allowClear
          />
        </div>

        {/* Cart table */}
        <Table
          dataSource={cart}
          rowKey="productId"
          columns={cartColumns}
          size="small"
          pagination={false}
          scroll={{ x: 700 }}
          locale={{ emptyText: 'Chưa có sản phẩm. Tìm và chọn sản phẩm ở trên.' }}
        />

        {/* Summary */}
        {cart.length > 0 && (
          <div
            style={{
              marginTop: 12,
              textAlign: 'right',
              paddingRight: 8,
              borderTop: '1px solid #f0f0f0',
              paddingTop: 10,
            }}
          >
            <Text strong style={{ fontSize: 15 }}>
              Tổng tiền:{' '}
              <Text style={{ color: '#52c41a', fontSize: 16 }}>
                {formatCurrency(cartTotal)}
              </Text>
            </Text>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default PurchaseReceiptsPage;
