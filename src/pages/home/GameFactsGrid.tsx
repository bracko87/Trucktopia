import React from 'react';
import { Box, Package, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FactCardProps {
  title: string;
  value: string;
  description: string;
  icon?: React.ReactNode;
}

const FactCard: React.FC<FactCardProps> = ({ title, value, description, icon }) => {
  return (
    <article className="bg-white/3 rounded-xl p-4 border border-slate-700 shadow-sm">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-md bg-slate-100/6 text-slate-200">
          {icon}
        </div>
        <div>
          <div className="text-xs text-slate-400">{title}</div>
          <div className="text-xl font-semibold mt-1 text-white">{value}</div>
          <div className="text-sm text-slate-300 mt-2">{description}</div>
        </div>
      </div>
    </article>
  );
};

const GameFactsGrid: React.FC = () => {
  const { t } = useTranslation();
  const facts = [
    {
      title: t('landing.facts.contracts_title'),
      value: t('landing.facts.contracts_val'),
      description: t('landing.facts.contracts_desc'),
      icon: <Package className="w-5 h-5" />
    },
    {
      title: t('landing.facts.market_title'),
      value: t('landing.facts.market_val'),
      description: t('landing.facts.market_desc'),
      icon: <Globe className="w-5 h-5" />
    },
    {
      title: t('landing.facts.time_title'),
      value: t('landing.facts.time_val'),
      description: t('landing.facts.time_desc'),
      icon: <Box className="w-5 h-5" />
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {facts.map((f, i) => (
        <FactCard
          key={i}
          title={f.title}
          value={f.value}
          description={f.description}
          icon={f.icon}
        />
      ))}
    </div>
  );
};

export default GameFactsGrid;