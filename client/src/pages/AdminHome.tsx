import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutDashboard } from 'lucide-react';

export default function AdminHome() {
  return (
    <AdminLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">概覽</h1>
          <p className="text-muted-foreground mt-1">平台監控儀表板</p>
        </div>

        <Card>
          <CardContent className="py-20 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
            <LayoutDashboard className="w-10 h-10 opacity-20" />
            <p className="text-sm">監視功能建置中，未來將顯示平台統計與節點狀態。</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
