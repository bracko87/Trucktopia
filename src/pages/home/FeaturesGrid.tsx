import React from 'react';
import { Truck, Map, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
  return (
    <div className="p-6 rounded-2xl border border-slate-700 shadow-sm bg-slate-800/60">
      <div className="flex items-start space-x-4">
        <div className="p-3 rounded-lg bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h4 className="text-lg font-semibold text-white">{title}</h4>
          <p className="text-sm text-slate-300 mt-2 max-w-md">{description}</p>
        </div>
      </div>
    </div>
  );
};

const FeaturesGrid: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <FeatureCard
        title={t('landing.features.fleet_title')}
        description={t('landing.features.fleet_desc')}
        icon={<Truck className="w-6 h-6 text-amber-400" />}
      />
      <FeatureCard
        title={t('landing.features.network_title')}
        description={t('landing.features.network_desc')}
        icon={<Map className="w-6 h-6 text-green-400" />}
      />
      <FeatureCard
        title={t('landing.features.growth_title')}
        description={t('landing.features.growth_desc')}
        icon={<DollarSign className="w-6 h-6 text-blue-400" />}
      />
    </div>
  );
};

export default FeaturesGrid;