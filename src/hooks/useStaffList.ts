import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type StaffItem = {
  id: string;
  full_name: string | null;
  username: string | null;
};

/**
 * ดึงรายชื่อพนักงานจากตาราง users (แหล่งเดียวกับ ProductForm)
 * ใช้ทั้งหน้าเพิ่มสินค้าและหน้าขายสินค้า
 */
export function useStaffList() {
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const fetchStaff = async () => {
      setLoadingStaff(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, username')
          .eq('status', 'active')
          .order('username');

        if (cancelled) return;
        if (error) {
          console.error('Error fetching staff:', error);
          toast({
            title: 'ข้อผิดพลาด',
            description: 'ไม่สามารถโหลดรายชื่อพนักงานได้: ' + error.message,
            variant: 'destructive',
          });
          setStaff([]);
          return;
        }

        if (data && data.length > 0) {
          setStaff(data);
        } else {
          setStaff([]);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          console.error('Error fetching staff:', err);
          toast({
            title: 'ข้อผิดพลาด',
            description: 'ไม่สามารถโหลดรายชื่อพนักงานได้',
            variant: 'destructive',
          });
          setStaff([]);
        }
      } finally {
        if (!cancelled) setLoadingStaff(false);
      }
    };

    fetchStaff();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { staff, loadingStaff };
}
