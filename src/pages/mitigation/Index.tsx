import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const MitigationIndex = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('mitigation')}</h2>
      <div className="bg-[#1e2130] p-6 rounded-lg border border-[#2a2d3e]">
        <p className="text-gray-400">{t('under_construction')}</p>
      </div>
    </div>
  );
};

export default MitigationIndex;