/**
 * Apps Page
 * Browse and manage AI applications
 */
import { BarChart2, Footprints } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface AppCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
  onClick: () => void;
}

function AppCard({ title, description, icon, comingSoon, onClick }: AppCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200',
        comingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md hover:border-primary/50'
      )}
      onClick={comingSoon ? undefined : onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              {comingSoon && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  敬请期待
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const apps = [
  {
    id: 'stock',
    title: 'A股量化',
    description: '基于 AkShare 库获取A股行情、财务数据、板块信息等',
    icon: <BarChart2 className="h-6 w-6" />,
    comingSoon: false,
  },
  {
    id: 'football',
    title: '足球分析',
    description: '足球赛事数据查询与分析',
    icon: <Footprints className="h-6 w-6" />,
    comingSoon: true,
  },
];

export function Apps() {
  const navigate = useNavigate();

  const handleAppClick = (appId: string, comingSoon: boolean) => {
    if (!comingSoon) {
      navigate(`/apps/${appId}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b bg-background/80 backdrop-blur-sm">
        <h1 className="text-2xl font-bold tracking-tight">AI应用</h1>
        <p className="text-sm text-muted-foreground mt-1">选择应用并填写参数，AI将为您查询和分析数据</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              title={app.title}
              description={app.description}
              icon={app.icon}
              comingSoon={app.comingSoon}
              onClick={() => handleAppClick(app.id, app.comingSoon)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Apps;
