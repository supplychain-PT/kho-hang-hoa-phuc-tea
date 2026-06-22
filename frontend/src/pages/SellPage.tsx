import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Input, Button, Typography, Tag, InputNumber, Select,
  Divider, message, Tooltip, Space, Empty, Checkbox,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, CloseOutlined,
  BarcodeOutlined, UserOutlined, ArrowLeftOutlined,
  ReloadOutlined, PrinterOutlined, CheckOutlined,
} from '@ant-design/icons';
import { productsService } from '../services/products.service';
import { storesService } from '../services/stores.service';
import { ordersService } from '../services/orders.service';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/format';
import { Product } from '../types';

const { Text } = Typography;
const { Option } = Select;

interface CartItem {
  product: Product;
  quantity: number;
}

interface Invoice {
  id: string;
  label: string;
  storeId: string;
  cart: CartItem[];
  note: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  customerPaid: number;
}

let invoiceCounter = 1;
const makeInvoice = (): Invoice => ({
  id: `inv-${Date.now()}-${Math.random()}`,
  label: `Hóa đơn ${invoiceCounter++}`,
  storeId: '',
  cart: [],
  note: '',
  paymentMethod: 'CASH',
  customerPaid: 0,
});

function SellPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isStoreOwner = user?.role === 'STORE_OWNER';
  const queryClient = useQueryClient();

  /* ── Tabs / invoices ────────────────────────────────────────── */
  const [invoices, setInvoices] = useState<Invoice[]>(() => [makeInvoice()]);
  const [activeId, setActiveId] = useState(() => invoices[0]?.id || '');

  const activeInvoice: Invoice = invoices.find((i) => i.id === activeId) || invoices[0];

  const updateActive = useCallback((patch: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === activeId ? { ...inv, ...patch } : inv)),
    );
  }, [activeId]);

  /* ── Product search ─────────────────────────────────────────── */
  const [productSearch, setProductSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [storeSearch, setStoreSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const searchRef = useRef<any>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* ── Queries ────────────────────────────────────────────────── */
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: productsService.getCategories,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', 'sell', categoryId],
    queryFn: () => productsService.getAll({ categoryId, limit: 500 }),
    placeholderData: (prev: any) => prev,
  });

  const { data: allStoresData } = useQuery({
    queryKey: ['stores-sell', storeSearch],
    queryFn: () => storesService.getAll({ limit: 100, search: storeSearch }),
    enabled: !isStoreOwner,
  });

  /* ── Derived data ───────────────────────────────────────────── */
  const storeList: any[] = isStoreOwner
    ? (user?.stores || [])
    : (allStoresData?.data || []);

  const selectedStore = storeList.find((s) => s.id === activeInvoice.storeId);

  const normalize = useCallback((s: string) => s.toLowerCase().normalize('NFC'), []);

  const filteredProducts: Product[] = useMemo(() => {
    if (!productSearch.trim()) return [];
    const kw = normalize(productSearch.trim());
    const all: Product[] = productsData?.data || [];
    return all
      .filter((p) => normalize(p.name).includes(kw) || normalize(p.code).includes(kw))
      .slice(0, 60);
  }, [productsData, productSearch, normalize]);

  /* ── Click outside to close panel ──────────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
        setSelectedProductIds([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Cart operations ────────────────────────────────────────── */
  const addToCart = useCallback((product: Product) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== activeId) return inv;
        const existing = inv.cart.find((i) => i.product.id === product.id);
        return {
          ...inv,
          cart: existing
            ? inv.cart.map((i) =>
                i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
              )
            : [...inv.cart, { product, quantity: 1 }],
        };
      }),
    );
  }, [activeId]);

  const toggleProductSelect = useCallback((productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  }, []);

  const addSelectedToCart = useCallback(() => {
    const allProducts: Product[] = productsData?.data || [];
    selectedProductIds.forEach((id) => {
      const product = allProducts.find((p) => p.id === id);
      if (product) addToCart(product);
    });
    setSelectedProductIds([]);
    setProductSearch('');
    setPanelOpen(false);
    setTimeout(() => searchRef.current?.focus(), 60);
  }, [selectedProductIds, productsData, addToCart]);

  const toggleSelectAll = useCallback(() => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  }, [selectedProductIds, filteredProducts]);

  const updateQty = useCallback((productId: string, quantity: number) => {
    // Không bao giờ tự xóa sản phẩm — chỉ nút Delete mới xóa
    const safeQty = Math.max(1, quantity || 1);
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== activeId) return inv;
        return {
          ...inv,
          cart: inv.cart.map((i) =>
            i.product.id === productId ? { ...i, quantity: safeQty } : i,
          ),
        };
      }),
    );
  }, [activeId]);

  const removeItem = useCallback((productId: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id !== activeId
          ? inv
          : { ...inv, cart: inv.cart.filter((i) => i.product.id !== productId) },
      ),
    );
  }, [activeId]);

  /* ── Totals ─────────────────────────────────────────────────── */
  const totalAmount = useMemo(
    () => activeInvoice.cart.reduce((s, i) => s + i.product.sellingPrice * i.quantity, 0),
    [activeInvoice.cart],
  );

  const totalQty = useMemo(
    () => activeInvoice.cart.reduce((s, i) => s + i.quantity, 0),
    [activeInvoice.cart],
  );

  const quickAmounts = useMemo(() => {
    if (totalAmount === 0) return [];
    const unit = 100_000;
    const rounded = Math.ceil(totalAmount / unit) * unit;
    const set = new Set([totalAmount, rounded, rounded + unit]);
    return [...set].filter((a) => a >= totalAmount).sort((a, b) => a - b).slice(0, 3);
  }, [totalAmount]);

  const changeAmount = useMemo(() => {
    const paid = activeInvoice.customerPaid;
    return paid > totalAmount ? paid - totalAmount : 0;
  }, [activeInvoice.customerPaid, totalAmount]);

  const debtAmount = useMemo(() => {
    const paid = activeInvoice.customerPaid;
    return totalAmount - paid > 0 ? totalAmount - paid : 0;
  }, [activeInvoice.customerPaid, totalAmount]);

  /* ── Mutations ──────────────────────────────────────────────── */
  const resetTab = useCallback(() => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id !== activeId
          ? inv
          : { ...makeInvoice(), id: inv.id, label: inv.label },
      ),
    );
  }, [activeId]);

  const saveMutation = useMutation({
    mutationFn: (inv: Invoice) =>
      ordersService.create({
        storeId: inv.storeId,
        note: inv.note,
        items: inv.cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      }),
    onSuccess: (order) => {
      message.success(`Đã lưu phiếu ${order.orderNumber}`);
      resetTab();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi lưu phiếu'),
  });

  const createMutation = useMutation({
    mutationFn: async (inv: Invoice) => {
      const order = await ordersService.create({
        storeId: inv.storeId,
        note: inv.note,
        items: inv.cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      });
      await ordersService.approve(order.id);
      return order;
    },
    onSuccess: (order) => {
      message.success(`Tạo hóa đơn ${order.orderNumber} thành công!`);
      closeTab(activeId);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || 'Lỗi tạo hóa đơn'),
  });

  /* ── Tab management ─────────────────────────────────────────── */
  const addTab = () => {
    const inv = makeInvoice();
    setInvoices((prev) => [...prev, inv]);
    setActiveId(inv.id);
  };

  const closeTab = useCallback((id: string) => {
    setInvoices((prev) => {
      const next = prev.filter((inv) => inv.id !== id);
      if (next.length === 0) {
        const fresh = makeInvoice();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (activeId === id) setActiveId(next[next.length - 1].id);
      return next;
    });
  }, [activeId]);

  /* ── Submit handlers ────────────────────────────────────────── */
  const validate = () => {
    if (!activeInvoice.storeId) { message.error('Vui lòng chọn cửa hàng'); return false; }
    if (activeInvoice.cart.length === 0) { message.error('Vui lòng thêm sản phẩm'); return false; }
    return true;
  };

  const handleSave = () => { if (validate()) saveMutation.mutate(activeInvoice); };
  const handleCreate = () => { if (validate()) createMutation.mutate(activeInvoice); };

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f5', overflow: 'hidden' }}>

      {/* ── TOP BAR ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', background: '#fff',
        borderBottom: '1px solid #e0e0e0', padding: '0 8px', height: 46, gap: 6, flexShrink: 0,
      }}>
        {/* Product search with multi-select panel */}
        <div ref={panelRef} style={{ flexShrink: 0, width: 300, position: 'relative' }}>
          <Input
            ref={searchRef}
            prefix={<BarcodeOutlined style={{ color: '#aaa' }} />}
            placeholder="Tìm hàng hóa (F3)"
            size="middle"
            allowClear
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setPanelOpen(true);
              setSelectedProductIds([]);
            }}
            onFocus={() => {
              if (productSearch.trim()) setPanelOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setPanelOpen(false);
                setSelectedProductIds([]);
              }
              if (e.key === 'Enter' && selectedProductIds.length > 0) {
                addSelectedToCart();
              }
            }}
          />

          {/* Multi-select product panel */}
          {panelOpen && filteredProducts.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 1100,
              width: 520,
              maxHeight: 400,
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              boxShadow: '0 6px 24px rgba(0,0,0,0.13)',
              display: 'flex',
              flexDirection: 'column',
              marginTop: 4,
              overflow: 'hidden',
            }}>
              {/* Panel header */}
              <div style={{
                padding: '7px 12px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#fafafa',
                flexShrink: 0,
              }}>
                <Checkbox
                  checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                  indeterminate={selectedProductIds.length > 0 && selectedProductIds.length < filteredProducts.length}
                  onChange={toggleSelectAll}
                />
                <Text type="secondary" style={{ fontSize: 12, flex: 1 }}>
                  {filteredProducts.length} sản phẩm
                  {selectedProductIds.length > 0 && (
                    <Text strong style={{ color: '#1677ff' }}> · Đã chọn {selectedProductIds.length}</Text>
                  )}
                </Text>
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined style={{ fontSize: 11 }} />}
                  onClick={() => { setPanelOpen(false); setSelectedProductIds([]); }}
                  style={{ color: '#aaa' }}
                />
              </div>

              {/* Product list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredProducts.map((p) => {
                  const isChecked = selectedProductIds.includes(p.id);
                  const inCart = activeInvoice.cart.find((c) => c.product.id === p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleProductSelect(p.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '7px 12px',
                        cursor: 'pointer',
                        background: isChecked ? '#e6f7ff' : 'transparent',
                        borderBottom: '1px solid #f5f5f5',
                        transition: 'background 0.1s',
                      }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={() => toggleProductSelect(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <Text code style={{ fontSize: 11, flexShrink: 0 }}>{p.code}</Text>
                          <Text style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>/ {p.unit}</Text>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {inCart && (
                          <Tag color="green" style={{ fontSize: 11, margin: 0, padding: '0 5px' }}>
                            Giỏ: {inCart.quantity}
                          </Tag>
                        )}
                        <Text strong style={{ color: '#52c41a', fontSize: 13 }}>
                          {formatCurrency(p.sellingPrice)}
                        </Text>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Panel footer */}
              <div style={{
                padding: '8px 12px',
                borderTop: '1px solid #f0f0f0',
                background: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
              }}>
                {selectedProductIds.length > 0 ? (
                  <>
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={addSelectedToCart}
                      style={{ fontWeight: 600 }}
                    >
                      Thêm {selectedProductIds.length} sản phẩm vào giỏ
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setSelectedProductIds([])}
                    >
                      Bỏ chọn
                    </Button>
                  </>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Tick chọn sản phẩm rồi bấm Thêm, hoặc nhấn Enter
                  </Text>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Category filter */}
        <Select
          placeholder="Nhóm hàng"
          value={categoryId}
          onChange={(v) => { setCategoryId(v); setProductSearch(''); setPanelOpen(false); }}
          allowClear
          style={{ width: 140, flexShrink: 0 }}
          size="middle"
        >
          {(categoriesData || []).map((cat: any) => (
            <Option key={cat.id} value={cat.id}>{cat.name}</Option>
          ))}
        </Select>

        {/* Invoice tabs */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden', marginLeft: 4 }}>
          {invoices.map((inv) => {
            const isActive = inv.id === activeId;
            return (
              <div
                key={inv.id}
                onClick={() => setActiveId(inv.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                  background: isActive ? '#1677ff' : '#f0f0f0',
                  color: isActive ? '#fff' : '#444',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  border: isActive ? '1px solid #1677ff' : '1px solid #e0e0e0',
                  maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.label}</span>
                {inv.cart.length > 0 && (
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : '#1677ff',
                    color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, flexShrink: 0,
                  }}>
                    {inv.cart.length}
                  </span>
                )}
                <CloseOutlined
                  style={{ fontSize: 10, flexShrink: 0, opacity: 0.7 }}
                  onClick={(e) => { e.stopPropagation(); closeTab(inv.id); }}
                />
              </div>
            );
          })}
          <Tooltip title="Hóa đơn mới">
            <Button type="text" icon={<PlusOutlined />} size="small" onClick={addTab} style={{ color: '#666', flexShrink: 0 }} />
          </Tooltip>
        </div>

        {/* Right icons */}
        <Space size={4} style={{ flexShrink: 0 }}>
          <Tooltip title="Quay lại">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')} />
          </Tooltip>
          <Tooltip title="Làm mới">
            <Button type="text" icon={<ReloadOutlined />} onClick={resetTab} />
          </Tooltip>
          <Tooltip title="In hóa đơn">
            <Button type="text" icon={<PrinterOutlined />} />
          </Tooltip>
          <div style={{
            background: '#52c41a', color: '#fff', borderRadius: 4,
            padding: '3px 10px', fontSize: 13, fontWeight: 600, cursor: 'default',
          }}>
            {user?.fullName?.split(' ').slice(-1)[0] || 'Admin'}
          </div>
        </Space>
      </div>

      {/* ── MAIN BODY ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT: Cart ───────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Cart table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '32px 32px 110px 1fr 90px 110px 120px 56px',
            background: '#fafafa', borderBottom: '1px solid #e8e8e8',
            padding: '6px 12px', fontSize: 12, color: '#888', fontWeight: 600,
            flexShrink: 0,
          }}>
            <span />
            <span />
            <span>Mã HH</span>
            <span>Tên hàng hóa</span>
            <span style={{ textAlign: 'center' }}>SL</span>
            <span style={{ textAlign: 'right' }}>Đơn giá</span>
            <span style={{ textAlign: 'right' }}>Thành tiền</span>
            <span />
          </div>

          {/* Cart rows */}
          <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
            {activeInvoice.cart.length === 0 ? (
              <Empty
                description={
                  <span style={{ color: '#aaa', fontSize: 13 }}>
                    Tìm sản phẩm ở thanh tìm kiếm phía trên để thêm vào hóa đơn
                  </span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ marginTop: 64 }}
              />
            ) : (
              activeInvoice.cart.map((item, idx) => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 32px 110px 1fr 90px 110px 120px 56px',
                    padding: '8px 12px', alignItems: 'center',
                    borderBottom: '1px solid #f0f0f0',
                    background: idx % 2 === 0 ? '#fff' : '#fafeff',
                  }}
                >
                  {/* Row number */}
                  <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>{idx + 1}</Text>

                  {/* Delete */}
                  <Button
                    type="text" danger size="small" icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                    onClick={() => removeItem(item.product.id)}
                    style={{ padding: 0 }}
                  />

                  {/* Code */}
                  <Text code style={{ fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.product.code}
                  </Text>

                  {/* Name + category */}
                  <div style={{ overflow: 'hidden' }}>
                    <Text strong style={{ fontSize: 13, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product.name}
                    </Text>
                    {(item.product as any).category?.name && (
                      <Tag style={{ fontSize: 10, marginTop: 1 }} color="blue">
                        {(item.product as any).category.name}
                      </Tag>
                    )}
                  </div>

                  {/* Quantity — clear on focus */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <InputNumber
                      min={1}
                      value={item.quantity}
                      onChange={(val) => updateQty(item.product.id, val ?? 1)}
                      style={{ width: 72 }}
                      size="small"
                      controls
                      onFocus={(e) => {
                        setTimeout(() => (e.target as HTMLInputElement).select(), 0);
                      }}
                    />
                  </div>

                  {/* Unit price */}
                  <Text style={{ textAlign: 'right', display: 'block', fontSize: 13 }}>
                    {formatCurrency(item.product.sellingPrice)}
                  </Text>

                  {/* Total */}
                  <Text strong style={{ textAlign: 'right', display: 'block', fontSize: 13, color: '#222' }}>
                    {formatCurrency(item.product.sellingPrice * item.quantity)}
                  </Text>

                  {/* Quick +1 */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Button
                      type="text" size="small" icon={<PlusOutlined style={{ fontSize: 11 }} />}
                      onClick={() => updateQty(item.product.id, item.quantity + 1)}
                      style={{ color: '#1677ff' }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Note */}
          <div style={{ borderTop: '1px solid #e8e8e8', background: '#fff', padding: '6px 12px', flexShrink: 0 }}>
            <Input
              placeholder="Ghi chú đơn hàng..."
              value={activeInvoice.note}
              onChange={(e) => updateActive({ note: e.target.value })}
              variant="borderless"
              style={{ fontSize: 13, color: '#888', padding: 0 }}
            />
          </div>
        </div>

        {/* ── RIGHT: Customer + Summary ─────────────────────── */}
        <div style={{
          width: 300, background: '#fff', borderLeft: '1px solid #e0e0e0',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>

          {/* Store / Customer selector */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
            {selectedStore ? (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '8px 10px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6,
              }}>
                <div style={{ overflow: 'hidden' }}>
                  <Text strong style={{ color: '#389e0d', fontSize: 13, display: 'block' }}>
                    {selectedStore.name || selectedStore.code}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{selectedStore.code}</Text>
                </div>
                <Button
                  type="text" size="small" icon={<CloseOutlined />}
                  onClick={() => updateActive({ storeId: '', customerPaid: 0 })}
                  style={{ flexShrink: 0 }}
                />
              </div>
            ) : (
              <Select
                showSearch
                placeholder={<><UserOutlined /> Chọn cửa hàng nhận hàng...</>}
                style={{ width: '100%' }}
                filterOption={false}
                onSearch={setStoreSearch}
                onChange={(val) => updateActive({ storeId: val })}
                notFoundContent="Không tìm thấy"
                allowClear
                size="middle"
              >
                {isStoreOwner
                  ? (user?.stores || []).map((s: any) => (
                    <Option key={s.id} value={s.id}>
                      <Text strong>{s.code}</Text>
                      {s.name ? <Text type="secondary"> — {s.name}</Text> : null}
                    </Option>
                  ))
                  : (allStoresData?.data || []).map((s: any) => (
                    <Option key={s.id} value={s.id}>
                      <Text strong>{s.code}</Text>
                      {s.name ? <Text type="secondary"> — {s.name}</Text> : null}
                    </Option>
                  ))
                }
              </Select>
            )}
          </div>

          {/* Order summary */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Tổng tiền hàng ({totalQty} sp)
              </Text>
              <Text style={{ fontSize: 13 }}>{formatCurrency(totalAmount)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Giảm giá</Text>
              <Text style={{ fontSize: 13 }}>0</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Thu khác</Text>
              <Text style={{ fontSize: 13 }}>0</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text strong style={{ fontSize: 14 }}>Khách cần trả</Text>
              <Text strong style={{ fontSize: 16, color: '#1677ff' }}>{formatCurrency(totalAmount)}</Text>
            </div>

            {/* Payment methods */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[
                { key: 'CASH', label: 'Tiền mặt' },
                { key: 'BANK_TRANSFER', label: 'Chuyển khoản' },
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  size="small"
                  type={activeInvoice.paymentMethod === key ? 'primary' : 'default'}
                  onClick={() => updateActive({ paymentMethod: key as any })}
                  style={{ borderRadius: 16, fontSize: 12 }}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Quick amount buttons */}
            {quickAmounts.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    size="small"
                    type={activeInvoice.customerPaid === amt ? 'primary' : 'default'}
                    onClick={() => updateActive({ customerPaid: amt })}
                    style={{ fontSize: 11, borderRadius: 4 }}
                  >
                    {formatCurrency(amt)}
                  </Button>
                ))}
              </div>
            )}

            {/* Customer paid input */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Khách thanh toán</Text>
              <InputNumber
                value={activeInvoice.customerPaid || undefined}
                placeholder="0"
                onChange={(val) => updateActive({ customerPaid: val || 0 })}
                formatter={(v) => (v ? `${Number(v).toLocaleString('vi-VN')}` : '')}
                parser={(v) => Number((v || '').replace(/[^\d]/g, '')) as any}
                style={{ width: 120 }}
                size="small"
                controls={false}
                onFocus={(e) => setTimeout(() => (e.target as HTMLInputElement).select(), 0)}
              />
            </div>

            {/* Change */}
            {changeAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Tiền thối</Text>
                <Text strong style={{ fontSize: 13, color: '#fa8c16' }}>
                  {formatCurrency(changeAmount)}
                </Text>
              </div>
            )}

            {/* Debt */}
            {debtAmount > 0 && totalAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Tính vào công nợ</Text>
                <Text style={{ fontSize: 13, color: '#f5222d' }}>
                  -{formatCurrency(debtAmount)}
                </Text>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, flexShrink: 0 }}>
            <Button
              type="primary"
              size="large"
              loading={saveMutation.isPending}
              onClick={handleSave}
              disabled={!activeInvoice.storeId || activeInvoice.cart.length === 0}
              style={{ flex: 1, fontWeight: 700, fontSize: 14, background: '#fa8c16', borderColor: '#fa8c16' }}
            >
              PHIẾU TẠM
            </Button>
            <Button
              type="primary"
              size="large"
              loading={createMutation.isPending}
              onClick={handleCreate}
              disabled={!activeInvoice.storeId || activeInvoice.cart.length === 0}
              style={{ flex: 1, fontWeight: 700, fontSize: 14, background: '#1677ff' }}
            >
              HÓA ĐƠN
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SellPage;
