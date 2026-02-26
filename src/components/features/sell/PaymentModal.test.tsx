import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentModal } from './PaymentModal';
import type { CartItemForPayment } from '@/types/common.types';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    rpc: vi.fn().mockResolvedValue({ error: { code: 'PGRST202' } }),
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'product-1' }, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

const toastSpy = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

describe('PaymentModal validation', () => {
  beforeEach(() => {
    toastSpy.mockReset();
  });

  const baseProps: React.ComponentProps<typeof PaymentModal> = {
    open: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    total: 1000,
    items: [{ id: 'p1', shop_code: 'C001' } as CartItemForPayment],
  };

  it('shows error when customer name is empty', async () => {
    render(<PaymentModal {...baseProps} />);

    const confirmBtn = screen.getByText('ยืนยันการขาย');
    fireEvent.click(confirmBtn);

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'กรุณาระบุชื่อลูกค้า' }),
    );
  });

  it('shows error for invalid phone format', () => {
    render(<PaymentModal {...baseProps} />);

    fireEvent.change(screen.getByPlaceholderText('ระบุชื่อผู้ซื้อ'), {
      target: { value: 'ลูกค้า' },
    });
    fireEvent.change(screen.getByPlaceholderText('08x-xxx-xxxx'), {
      target: { value: '1234' },
    });

    fireEvent.click(screen.getByText('ยืนยันการขาย'));

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'รูปแบบเบอร์โทรไม่ถูกต้อง' }),
    );
  });

  it('requires phone when payment method is installment', async () => {
    render(<PaymentModal {...baseProps} />);

    fireEvent.change(screen.getByPlaceholderText('ระบุชื่อผู้ซื้อ'), {
      target: { value: 'ลูกค้า' },
    });

    // เปิด Select แล้วคลิกตัวเลือก "ผ่อนชำระ" โดยตรง (Radix Select ใน jsdom)
    const combobox = screen.getByRole('combobox');
    fireEvent.click(combobox);
    const installmentOption = await waitFor(() =>
      screen.getByRole('option', { name: /ผ่อนชำระ/ }),
    );
    fireEvent.click(installmentOption);

    fireEvent.click(screen.getByText('ยืนยันการขาย'));

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'กรุณาระบุเบอร์โทรสำหรับผ่อนชำระ' }),
    );
  });
});

