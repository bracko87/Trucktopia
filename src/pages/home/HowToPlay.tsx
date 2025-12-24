import React from 'react';
import { List, ShoppingCart, Settings, Repeat } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StepItemProps {
  index: number;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const StepItem: React.FC<StepItemProps> = ({ index, title, description, icon }) => (
  <div className="flex items-start space-x-4">
    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-semibold">
      {index}
    </div>
    <div>
      <div className="flex items-center space-x-2">
        {icon}
        <h4 className="text-lg font-semibold text-white">{title}</h4>
      </div>
      <p className="text-sm text-slate-300 mt-2">{description}</p>
    </div>
  </div>
);

const HowToPlay: React.FC = () => {
  const { t } = useTranslation();
  const steps = [
    {
      title: t('landing.how_to.step1_title'),
      description: t('landing.how_to.step1_desc'),
      icon: <List className="w-5 h-5 text-slate-300" />
    },
    {
      title: t('landing.how_to.step2_title'),
      description: t('landing.how_to.step2_desc'),
      icon: <ShoppingCart className="w-5 h-5 text-slate-300" />
    },
    {
      title: t('landing.how_to.step3_title'),
      description: t('landing.how_to.step3_desc'),
      icon: <Settings className="w-5 h-5 text-slate-300" />
    },
    {
      title: t('landing.how_to.step4_title'),
      description: t('landing.how_to.step4_desc'),
      icon: <Repeat className="w-5 h-5 text-slate-300" />
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-6">
        {steps.map((s, i) => (
          <StepItem key={i} index={i + 1} title={s.title} description={s.description} icon={s.icon} />
        ))}
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 text-slate-300">
        <h3 className="text-xl font-semibold text-white mb-3">{t('landing.headings.tips_title')}</h3>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>{t('landing.how_to.tip1')}</li>
          <li>{t('landing.how_to.tip2')}</li>
          <li>{t('landing.how_to.tip3')}</li>
          <li>{t('landing.how_to.tip4')}</li>
        </ul>
      </div>
    </div>
  );
};

export default HowToPlay;