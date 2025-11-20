/**
 * Comprehensive skills database with bonuses and salary effects
 * Each skill provides specific benefits and increases staff value
 */

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'driver' | 'mechanic' | 'manager' | 'dispatcher';
  bonusType: 'salary' | 'performance' | 'specialization';
  salaryMultiplier: number; // How much this skill increases base salary
  effects: {
    type: string;
    value: number;
    description: string;
  }[];
  rarity: 'common' | 'uncommon' | 'rare' | 'expert';
}

// Skills database
export const skillsDatabase: Record<string, Skill> = {
  // DRIVER SKILLS
  'Long Haul': {
    id: 'long_haul',
    name: 'Long Haul',
    description: 'Experienced in extended distance transportation across multiple countries',
    category: 'driver',
    bonusType: 'performance',
    salaryMultiplier: 1.15,
    effects: [
      { type: 'fuel_efficiency', value: 0.08, description: '8% better fuel efficiency on long routes' },
      { type: 'route_speed', value: 0.05, description: '5% faster delivery times' },
      { type: 'reliability', value: 0.10, description: '10% less likely to have delays' }
    ],
    rarity: 'common'
  },

  'ADR Certified': {
    id: 'adr_certified',
    name: 'ADR Certified',
    description: 'Licensed to transport hazardous materials according to international regulations',
    category: 'driver',
    bonusType: 'specialization',
    salaryMultiplier: 1.25,
    effects: [
      { type: 'hazardous_pay', value: 0.20, description: '20% bonus for hazardous cargo' },
      { type: 'insurance_discount', value: 0.15, description: '15% lower insurance premiums' },
      { type: 'cargo_access', value: 1.0, description: 'Access to high-value hazardous contracts' }
    ],
    rarity: 'uncommon'
  },

  'Route Planning': {
    id: 'route_planning',
    name: 'Route Planning',
    description: 'Expert in finding optimal routes and avoiding traffic/weight restrictions',
    category: 'driver',
    bonusType: 'performance',
    salaryMultiplier: 1.12,
    effects: [
      { type: 'time_reduction', value: 0.07, description: '7% faster deliveries' },
      { type: 'fuel_savings', value: 0.06, description: '6% reduced fuel costs' },
      { type: 'toll_reduction', value: 0.05, description: '5% savings on tolls and fees' }
    ],
    rarity: 'common'
  },

  'Refrigerated Transport': {
    id: 'refrigerated_transport',
    name: 'Refrigerated Transport',
    description: 'Specialized in temperature-controlled cargo and cold chain logistics',
    category: 'driver',
    bonusType: 'specialization',
    salaryMultiplier: 1.18,
    effects: [
      { type: 'cargo_bonus', value: 0.15, description: '15% bonus for refrigerated cargo' },
      { type: 'cargo_preservation', value: 0.95, description: '5% better cargo preservation' },
      { type: 'special_contracts', value: 1.0, description: 'Access to food/pharma contracts' }
    ],
    rarity: 'uncommon'
  },

  'Oversized Loads': {
    id: 'oversized_loads',
    name: 'Oversized Loads',
    description: 'Certified to transport oversized and heavy cargo requiring special permits',
    category: 'driver',
    bonusType: 'specialization',
    salaryMultiplier: 1.22,
    effects: [
      { type: 'oversized_bonus', value: 0.25, description: '25% bonus for oversized cargo' },
      { type: 'permit_handling', value: 0.10, description: '10% faster permit processing' },
      { type: 'high_value_access', value: 1.0, description: 'Access to construction/industrial contracts' }
    ],
    rarity: 'rare'
  },

  'International Routes': {
    id: 'international_routes',
    name: 'International Routes',
    description: 'Experienced in cross-border transportation and customs procedures',
    category: 'driver',
    bonusType: 'performance',
    salaryMultiplier: 1.20,
    effects: [
      { type: 'customs_speed', value: 0.15, description: '15% faster customs clearance' },
      { type: 'international_bonus', value: 0.10, description: '10% bonus for international jobs' },
      { type: 'documentation', value: 0.12, description: '12% fewer documentation errors' }
    ],
    rarity: 'uncommon'
  },

  // ADDITIONAL DRIVER SKILLS
  'Night Driving': {
    id: 'night_driving',
    name: 'Night Driving',
    description: 'Experienced in driving during nighttime hours with enhanced safety awareness',
    category: 'driver',
    bonusType: 'performance',
    salaryMultiplier: 1.08,
    effects: [
      { type: 'night_efficiency', value: 0.10, description: '10% faster night deliveries' },
      { type: 'safety_rating', value: 0.15, description: '15% better night safety record' },
      { type: 'traffic_avoidance', value: 0.12, description: '12% less traffic delays' }
    ],
    rarity: 'common'
  },

  'Heavy Load Handling': {
    id: 'heavy_load_handling',
    name: 'Heavy Load Handling',
    description: 'Specialized in loading and securing heavy cargo safely and efficiently',
    category: 'driver',
    bonusType: 'specialization',
    salaryMultiplier: 1.15,
    effects: [
      { type: 'heavy_load_bonus', value: 0.12, description: '12% bonus for heavy cargo' },
      { type: 'loading_efficiency', value: 0.15, description: '15% faster loading times' },
      { type: 'safety_compliance', value: 0.10, description: '10% better safety compliance' }
    ],
    rarity: 'common'
  },

  'City Navigation': {
    id: 'city_navigation',
    name: 'City Navigation',
    description: 'Expert in navigating complex urban environments and tight city streets',
    category: 'driver',
    bonusType: 'performance',
    salaryMultiplier: 1.10,
    effects: [
      { type: 'city_efficiency', value: 0.12, description: '12% faster city deliveries' },
      { type: 'route_optimization', value: 0.08, description: '8% better route planning' },
      { type: 'parking_skills', value: 0.15, description: '15% faster parking and maneuvering' }
    ],
    rarity: 'common'
  },

  'Mountain Roads': {
    id: 'mountain_roads',
    name: 'Mountain Roads',
    description: 'Experienced in driving through mountainous terrain with steep grades',
    category: 'driver',
    bonusType: 'specialization',
    salaryMultiplier: 1.18,
    effects: [
      { type: 'mountain_bonus', value: 0.20, description: '20% bonus for mountain routes' },
      { type: 'safety_rating', value: 0.10, description: '10% better mountain safety' },
      { type: 'fuel_efficiency', value: 0.08, description: '8% better fuel on grades' }
    ],
    rarity: 'uncommon'
  },

  'Forest Roads': {
    id: 'forest_roads',
    name: 'Forest Roads',
    description: 'Skilled in navigating unpaved forest roads and logging routes',
    category: 'driver',
    bonusType: 'specialization',
    salaryMultiplier: 1.12,
    effects: [
      { type: 'forest_bonus', value: 0.15, description: '15% bonus for forest routes' },
      { type: 'terrain_handling', value: 0.12, description: '12% better terrain handling' },
      { type: 'damage_prevention', value: 0.10, description: '10% less vehicle damage' }
    ],
    rarity: 'uncommon'
  },

  'Eco Driving': {
    id: 'eco_driving',
    name: 'Eco Driving',
    description: 'Fuel-efficient driving techniques and environmental consciousness',
    category: 'driver',
    bonusType: 'performance',
    salaryMultiplier: 1.05,
    effects: [
      { type: 'fuel_savings', value: 0.12, description: '12% improved fuel efficiency' },
      { type: 'emissions_reduction', value: 0.15, description: '15% lower emissions' },
      { type: 'maintenance_savings', value: 0.08, description: '8% lower maintenance costs' }
    ],
    rarity: 'common'
  },

  'Multi-Axle Experience': {
    id: 'multi_axle_experience',
    name: 'Multi-Axle Experience',
    description: 'Experienced with vehicles having multiple axles and complex configurations',
    category: 'driver',
    bonusType: 'specialization',
    salaryMultiplier: 1.14,
    effects: [
      { type: 'multi_axle_bonus', value: 0.10, description: '10% bonus for complex vehicles' },
      { type: 'handling_skill', value: 0.12, description: '12% better vehicle handling' },
      { type: 'versatility', value: 0.08, description: '8% more versatile with equipment' }
    ],
    rarity: 'common'
  },

  'Tanker Transport': {
    id: 'tanker_transport',
    name: 'Tanker Transport',
    description: 'Specialized in liquid bulk transport and tanker operations',
    category: 'driver',
    bonusType: 'specialization',
    salaryMultiplier: 1.16,
    effects: [
      { type: 'tanker_bonus', value: 0.18, description: '18% bonus for tanker work' },
      { type: 'safety_compliance', value: 0.15, description: '15% better safety compliance' },
      { type: 'efficiency', value: 0.10, description: '10% faster loading/unloading' }
    ],
    rarity: 'uncommon'
  },

  'Livestock Transport': {
    id: 'livestock_transport',
    name: 'Livestock Transport',
    description: 'Experienced in animal welfare and livestock transportation regulations',
    category: 'driver',
    bonusType: 'specialization',
    salaryMultiplier: 1.17,
    effects: [
      { type: 'livestock_bonus', value: 0.20, description: '20% bonus for livestock transport' },
      { type: 'animal_welfare', value: 0.15, description: '15% better animal welfare compliance' },
      { type: 'regulatory_compliance', value: 0.12, description: '12% better regulatory compliance' }
    ],
    rarity: 'rare'
  },

  // MECHANIC SKILLS
  'Engine Repair': {
    id: 'engine_repair',
    name: 'Engine Repair',
    description: 'Expert in engine diagnostics, repair, and performance optimization',
    category: 'mechanic',
    bonusType: 'performance',
    salaryMultiplier: 1.15,
    effects: [
      { type: 'repair_time', value: 0.20, description: '20% faster engine repairs' },
      { type: 'engine_longevity', value: 0.10, description: '10% longer engine life' },
      { type: 'diagnostic_accuracy', value: 0.15, description: '15% more accurate diagnostics' }
    ],
    rarity: 'common'
  },

  'Transmission Repair': {
    id: 'transmission_repair',
    name: 'Transmission Repair',
    description: 'Specialized in manual and automatic transmission systems',
    category: 'mechanic',
    bonusType: 'specialization',
    salaryMultiplier: 1.18,
    effects: [
      { type: 'transmission_efficiency', value: 0.15, description: '15% faster transmission repairs' },
      { type: 'transmission_longevity', value: 0.10, description: '10% longer transmission life' },
      { type: 'diagnostic_accuracy', value: 0.12, description: '12% more accurate diagnostics' }
    ],
    rarity: 'uncommon'
  },

  'AC Systems': {
    id: 'ac_systems',
    name: 'AC Systems',
    description: 'Expert in vehicle air conditioning and climate control systems',
    category: 'mechanic',
    bonusType: 'specialization',
    salaryMultiplier: 1.12,
    effects: [
      { type: 'ac_efficiency', value: 0.20, description: '20% faster AC repairs' },
      { type: 'comfort_improvement', value: 0.10, description: '10% better driver comfort scores' },
      { type: 'seasonal_efficiency', value: 0.08, description: '8% faster seasonal prep' }
    ],
    rarity: 'common'
  },

  'Body Work': {
    id: 'body_work',
    name: 'Body Work',
    description: 'Skilled in vehicle body repair, dent removal, and cosmetic fixes',
    category: 'mechanic',
    bonusType: 'specialization',
    salaryMultiplier: 1.10,
    effects: [
      { type: 'body_repair_speed', value: 0.15, description: '15% faster body repairs' },
      { type: 'cost_savings', value: 0.12, description: '12% lower repair costs' },
      { type: 'quality_rating', value: 0.10, description: '10% better repair quality' }
    ],
    rarity: 'common'
  },

  'Tire Service': {
    id: 'tire_service',
    name: 'Tire Service',
    description: 'Expert in tire mounting, balancing, and tire pressure management',
    category: 'mechanic',
    bonusType: 'performance',
    salaryMultiplier: 1.08,
    effects: [
      { type: 'tire_efficiency', value: 0.20, description: '20% faster tire service' },
      { type: 'tire_longevity', value: 0.12, description: '12% longer tire life' },
      { type: 'safety_improvement', value: 0.10, description: '10% better tire safety' }
    ],
    rarity: 'common'
  },

  'Hydraulic Systems': {
    id: 'hydraulic_systems',
    name: 'Hydraulic Systems',
    description: 'Specialized in hydraulic brakes, lifts, and vehicle hydraulics',
    category: 'mechanic',
    bonusType: 'specialization',
    salaryMultiplier: 1.16,
    effects: [
      { type: 'hydraulic_efficiency', value: 0.18, description: '18% faster hydraulic repairs' },
      { type: 'safety_improvement', value: 0.12, description: '12% better braking safety' },
      { type: 'cost_savings', value: 0.10, description: '10% lower hydraulic costs' }
    ],
    rarity: 'uncommon'
  },

  'Welding': {
    id: 'welding',
    name: 'Welding',
    description: 'Expert in vehicle welding, frame repair, and structural repairs',
    category: 'mechanic',
    bonusType: 'specialization',
    salaryMultiplier: 1.14,
    effects: [
      { type: 'welding_efficiency', value: 0.15, description: '15% faster structural repairs' },
      { type: 'repair_quality', value: 0.12, description: '12% better repair durability' },
      { type: 'cost_savings', value: 0.10, description: '10% lower repair costs' }
    ],
    rarity: 'uncommon'
  },

  'Computer Diagnostics': {
    id: 'computer_diagnostics',
    name: 'Computer Diagnostics',
    description: 'Advanced skills in modern vehicle electronic diagnostic systems',
    category: 'mechanic',
    bonusType: 'performance',
    salaryMultiplier: 1.12,
    effects: [
      { type: 'diagnostic_speed', value: 0.25, description: '25% faster problem identification' },
      { type: 'accuracy', value: 0.20, description: '20% more accurate diagnostics' },
      { type: 'modern_compatibility', value: 0.15, description: '15% better with modern vehicles' }
    ],
    rarity: 'uncommon'
  },

  'Fleet Maintenance': {
    id: 'fleet_maintenance',
    name: 'Fleet Maintenance',
    description: 'Specialized in managing maintenance schedules for entire fleets',
    category: 'mechanic',
    bonusType: 'performance',
    salaryMultiplier: 1.20,
    effects: [
      { type: 'fleet_efficiency', value: 0.15, description: '15% better fleet uptime' },
      { type: 'cost_savings', value: 0.12, description: '12% lower fleet maintenance costs' },
      { type: 'scheduling_optimization', value: 0.10, description: '10% better maintenance scheduling' }
    ],
    rarity: 'rare'
  },

  'Electrical Systems': {
    id: 'electrical_systems',
    name: 'Electrical Systems',
    description: 'Specialized in vehicle electronics, wiring, and computer systems',
    category: 'mechanic',
    bonusType: 'specialization',
    salaryMultiplier: 1.18,
    effects: [
      { type: 'electrical_repair', value: 0.18, description: '18% faster electrical repairs' },
      { type: 'sensor_accuracy', value: 0.12, description: '12% better sensor calibration' },
      { type: 'diagnostic_tools', value: 0.10, description: '10% better with diagnostic equipment' }
    ],
    rarity: 'uncommon'
  },

  'Brake Systems': {
    id: 'brake_systems',
    name: 'Brake Systems',
    description: 'Expert in brake maintenance, ABS systems, and safety inspections',
    category: 'mechanic',
    bonusType: 'performance',
    salaryMultiplier: 1.12,
    effects: [
      { type: 'brake_repair_time', value: 0.15, description: '15% faster brake repairs' },
      { type: 'safety_rating', value: 0.08, description: '8% better safety inspection results' },
      { type: 'brake_longevity', value: 0.10, description: '10% longer brake life' }
    ],
    rarity: 'common'
  },

  'Suspension': {
    id: 'suspension',
    name: 'Suspension',
    description: 'Specialized in suspension systems, alignment, and ride comfort optimization',
    category: 'mechanic',
    bonusType: 'specialization',
    salaryMultiplier: 1.14,
    effects: [
      { type: 'suspension_repair', value: 0.16, description: '16% faster suspension repairs' },
      { type: 'tire_longevity', value: 0.08, description: '8% extended tire life' },
      { type: 'fuel_efficiency', value: 0.05, description: '5% better fuel economy' }
    ],
    rarity: 'common'
  },

  'Diagnostic Tools': {
    id: 'diagnostic_tools',
    name: 'Diagnostic Tools',
    description: 'Proficient with advanced diagnostic equipment and computer analysis',
    category: 'mechanic',
    bonusType: 'performance',
    salaryMultiplier: 1.10,
    effects: [
      { type: 'diagnostic_speed', value: 0.25, description: '25% faster problem identification' },
      { type: 'accuracy', value: 0.20, description: '20% more accurate diagnostics' },
      { type: 'cost_reduction', value: 0.08, description: '8% reduction in diagnostic costs' }
    ],
    rarity: 'common'
  },

  'Preventive Maintenance': {
    id: 'preventive_maintenance',
    name: 'Preventive Maintenance',
    description: 'Expert in scheduled maintenance and breakdown prevention strategies',
    category: 'mechanic',
    bonusType: 'performance',
    salaryMultiplier: 1.16,
    effects: [
      { type: 'breakdown_reduction', value: 0.30, description: '30% fewer breakdowns' },
      { type: 'maintenance_cost', value: 0.15, description: '15% lower maintenance costs' },
      { type: 'vehicle_uptime', value: 0.12, description: '12% better vehicle uptime' }
    ],
    rarity: 'uncommon'
  },

  // MANAGER SKILLS
  'Operations Management': {
    id: 'operations_management',
    name: 'Operations Management',
    description: 'Expert in managing day-to-day logistics operations and workflow optimization',
    category: 'manager',
    bonusType: 'performance',
    salaryMultiplier: 1.20,
    effects: [
      { type: 'efficiency', value: 0.12, description: '12% improved operational efficiency' },
      { type: 'cost_reduction', value: 0.08, description: '8% reduction in operational costs' },
      { type: 'team_productivity', value: 0.10, description: '10% better team productivity' }
    ],
    rarity: 'common'
  },

  'Public Relations': {
    id: 'public_relations',
    name: 'Public Relations',
    description: 'Skilled in managing company image and external communications',
    category: 'manager',
    bonusType: 'performance',
    salaryMultiplier: 1.14,
    effects: [
      { type: 'company_reputation', value: 0.15, description: '15% better company reputation' },
      { type: 'client_retention', value: 0.12, description: '12% higher client retention' },
      { type: 'brand_value', value: 0.10, description: '10% increased brand value' }
    ],
    rarity: 'uncommon'
  },

  'Quality Control': {
    id: 'quality_control',
    name: 'Quality Control',
    description: 'Expert in implementing and maintaining quality standards',
    category: 'manager',
    bonusType: 'performance',
    salaryMultiplier: 1.16,
    effects: [
      { type: 'service_quality', value: 0.15, description: '15% better service quality' },
      { type: 'error_reduction', value: 0.20, description: '20% fewer service errors' },
      { type: 'customer_satisfaction', value: 0.12, description: '12% higher customer satisfaction' }
    ],
    rarity: 'uncommon'
  },

  'Risk Management': {
    id: 'risk_management',
    name: 'Risk Management',
    description: 'Skilled in identifying and mitigating business risks',
    category: 'manager',
    bonusType: 'performance',
    salaryMultiplier: 1.18,
    effects: [
      { type: 'risk_reduction', value: 0.20, description: '20% lower operational risks' },
      { type: 'insurance_savings', value: 0.15, description: '15% lower insurance premiums' },
      { type: 'compliance_rate', value: 0.10, description: '10% better regulatory compliance' }
    ],
    rarity: 'rare'
  },

  'Contract Negotiation': {
    id: 'contract_negotiation',
    name: 'Contract Negotiation',
    description: 'Expert in negotiating favorable contracts with clients and suppliers',
    category: 'manager',
    bonusType: 'performance',
    salaryMultiplier: 1.22,
    effects: [
      { type: 'contract_value', value: 0.15, description: '15% better contract terms' },
      { type: 'cost_reduction', value: 0.12, description: '12% lower supply costs' },
      { type: 'profit_margins', value: 0.10, description: '10% improved profit margins' }
    ],
    rarity: 'rare'
  },

  'Marketing': {
    id: 'marketing',
    name: 'Marketing',
    description: 'Skilled in developing and executing marketing strategies',
    category: 'manager',
    bonusType: 'performance',
    salaryMultiplier: 1.15,
    effects: [
      { type: 'customer_acquisition', value: 0.20, description: '20% faster customer acquisition' },
      { type: 'brand_recognition', value: 0.12, description: '12% better brand recognition' },
      { type: 'market_share', value: 0.08, description: '8% increased market share' }
    ],
    rarity: 'uncommon'
  },

  'Legal Compliance': {
    id: 'legal_compliance',
    name: 'Legal Compliance',
    description: 'Expert in transportation regulations and legal requirements',
    category: 'manager',
    bonusType: 'performance',
    salaryMultiplier: 1.16,
    effects: [
      { type: 'compliance_rate', value: 0.20, description: '20% better compliance rate' },
      { type: 'fines_reduction', value: 0.15, description: '15% fewer regulatory fines' },
      { type: 'audit_performance', value: 0.10, description: '10% better audit performance' }
    ],
    rarity: 'uncommon'
  },

  'IT Management': {
    id: 'it_management',
    name: 'IT Management',
    description: 'Skilled in managing technology infrastructure and digital systems',
    category: 'manager',
    bonusType: 'performance',
    salaryMultiplier: 1.14,
    effects: [
      { type: 'system_efficiency', value: 0.15, description: '15% better system efficiency' },
      { type: 'digital_transformation', value: 0.12, description: '12% better digital adoption' },
      { type: 'cost_reduction', value: 0.10, description: '10% lower IT costs' }
    ],
    rarity: 'uncommon'
  },

  'Budget Planning': {
    id: 'budget_planning',
    name: 'Budget Planning',
    description: 'Skilled in financial planning, cost analysis, and budget optimization',
    category: 'manager',
    bonusType: 'performance',
    salaryMultiplier: 1.18,
    effects: [
      { type: 'cost_savings', value: 0.10, description: '10% better cost management' },
      { type: 'profit_margin', value: 0.08, description: '8% improved profit margins' },
      { type: 'forecast_accuracy', value: 0.15, description: '15% more accurate financial forecasting' }
    ],
    rarity: 'uncommon'
  },

  'Team Leadership': {
    id: 'team_leadership',
    name: 'Team Leadership',
    description: 'Expert in motivating teams, conflict resolution, and performance management',
    category: 'manager',
    bonusType: 'performance',
    salaryMultiplier: 1.22,
    effects: [
      { type: 'staff_retention', value: 0.15, description: '15% better staff retention' },
      { type: 'team_performance', value: 0.12, description: '12% better team performance' },
      { type: 'training_effectiveness', value: 0.10, description: '10% more effective training' }
    ],
    rarity: 'uncommon'
  },

  'Strategic Planning': {
    id: 'strategic_planning',
    name: 'Strategic Planning',
    description: 'Skilled in long-term business planning and growth strategies',
    category: 'manager',
    bonusType: 'performance',
    salaryMultiplier: 1.25,
    effects: [
      { type: 'growth_rate', value: 0.10, description: '10% faster company growth' },
      { type: 'market_expansion', value: 0.08, description: '8% more successful market expansion' },
      { type: 'opportunity_identification', value: 0.12, description: '12% better at spotting opportunities' }
    ],
    rarity: 'rare'
  },

  'HR Management': {
    id: 'hr_management',
    name: 'HR Management',
    description: 'Expert in recruitment, employee development, and workplace management',
    category: 'manager',
    bonusType: 'performance',
    salaryMultiplier: 1.15,
    effects: [
      { type: 'recruitment_speed', value: 0.20, description: '20% faster recruitment' },
      { type: 'employee_satisfaction', value: 0.15, description: '15% higher employee satisfaction' },
      { type: 'training_costs', value: 0.10, description: '10% lower training costs' }
    ],
    rarity: 'common'
  },

  // DISPATCHER SKILLS
  'Route Optimization': {
    id: 'route_optimization',
    name: 'Route Optimization',
    description: 'Expert in planning optimal routes and maximizing delivery efficiency',
    category: 'dispatcher',
    bonusType: 'performance',
    salaryMultiplier: 1.18,
    effects: [
      { type: 'fuel_savings', value: 0.10, description: '10% fuel savings through routing' },
      { type: 'time_efficiency', value: 0.08, description: '8% faster deliveries' },
      { type: 'capacity_utilization', value: 0.12, description: '12% better capacity utilization' }
    ],
    rarity: 'common'
  },

  'Weather Monitoring': {
    id: 'weather_monitoring',
    name: 'Weather Monitoring',
    description: 'Skilled in tracking weather patterns and adjusting routes accordingly',
    category: 'dispatcher',
    bonusType: 'performance',
    salaryMultiplier: 1.10,
    effects: [
      { type: 'weather_adaptation', value: 0.12, description: '12% better weather adaptation' },
      { type: 'delay_prevention', value: 0.15, description: '15% fewer weather delays' },
      { type: 'safety_improvement', value: 0.10, description: '10% better safety during bad weather' }
    ],
    rarity: 'common'
  },

  'Load Optimization': {
    id: 'load_optimization',
    name: 'Load Optimization',
    description: 'Expert in maximizing vehicle loading efficiency and space utilization',
    category: 'dispatcher',
    bonusType: 'performance',
    salaryMultiplier: 1.12,
    effects: [
      { type: 'space_utilization', value: 0.15, description: '15% better space utilization' },
      { type: 'fuel_efficiency', value: 0.08, description: '8% better fuel efficiency' },
      { type: 'capacity_increase', value: 0.10, description: '10% increased cargo capacity' }
    ],
    rarity: 'common'
  },

  'Customer Relations': {
    id: 'customer_relations',
    name: 'Customer Relations',
    description: 'Skilled in building and maintaining strong customer relationships',
    category: 'dispatcher',
    bonusType: 'performance',
    salaryMultiplier: 1.14,
    effects: [
      { type: 'customer_retention', value: 0.20, description: '20% higher customer retention' },
      { type: 'satisfaction_scores', value: 0.12, description: '12% better satisfaction scores' },
      { type: 'referral_generation', value: 0.08, description: '8% more customer referrals' }
    ],
    rarity: 'uncommon'
  },

  'Emergency Response': {
    id: 'emergency_response',
    name: 'Emergency Response',
    description: 'Expert in handling emergency situations and crisis management',
    category: 'dispatcher',
    bonusType: 'performance',
    salaryMultiplier: 1.16,
    effects: [
      { type: 'response_time', value: 0.25, description: '25% faster emergency response' },
      { type: 'crisis_resolution', value: 0.15, description: '15% better crisis resolution' },
      { type: 'safety_improvement', value: 0.10, description: '10% better emergency safety' }
    ],
    rarity: 'uncommon'
  },

  'Documentation': {
    id: 'documentation',
    name: 'Documentation',
    description: 'Expert in maintaining accurate documentation and paperwork',
    category: 'dispatcher',
    bonusType: 'performance',
    salaryMultiplier: 1.10,
    effects: [
      { type: 'documentation_accuracy', value: 0.20, description: '20% better documentation accuracy' },
      { type: 'compliance_rate', value: 0.12, description: '12% better regulatory compliance' },
      { type: 'efficiency', value: 0.08, description: '8% faster paperwork processing' }
    ],
    rarity: 'common'
  },

  'Regulatory Compliance': {
    id: 'regulatory_compliance',
    name: 'Regulatory Compliance',
    description: 'Skilled in ensuring compliance with transportation regulations',
    category: 'dispatcher',
    bonusType: 'performance',
    salaryMultiplier: 1.14,
    effects: [
      { type: 'compliance_rate', value: 0.18, description: '18% better regulatory compliance' },
      { type: 'fine_reduction', value: 0.15, description: '15% fewer compliance fines' },
      { type: 'audit_performance', value: 0.10, description: '10% better audit results' }
    ],
    rarity: 'uncommon'
  },

  'Customer Service': {
    id: 'customer_service',
    name: 'Customer Service',
    description: 'Skilled in client communication and maintaining customer satisfaction',
    category: 'dispatcher',
    bonusType: 'performance',
    salaryMultiplier: 1.12,
    effects: [
      { type: 'customer_retention', value: 0.15, description: '15% better customer retention' },
      { type: 'contract_renewal', value: 0.10, description: '10% higher contract renewal rates' },
      { type: 'satisfaction_rating', value: 0.12, description: '12% better satisfaction ratings' }
    ],
    rarity: 'common'
  },

  'Real-time Tracking': {
    id: 'realtime_tracking',
    name: 'Real-time Tracking',
    description: 'Proficient with GPS systems and real-time fleet monitoring',
    category: 'dispatcher',
    bonusType: 'performance',
    salaryMultiplier: 1.10,
    effects: [
      { type: 'response_time', value: 0.15, description: '15% faster emergency response' },
      { type: 'visibility', value: 0.20, description: '20% better fleet visibility' },
      { type: 'issue_prevention', value: 0.08, description: '8% better at preventing issues' }
    ],
    rarity: 'common'
  },

  'Communication Skills': {
    id: 'communication_skills',
    name: 'Communication Skills',
    description: 'Expert in coordinating between drivers, clients, and management',
    category: 'dispatcher',
    bonusType: 'performance',
    salaryMultiplier: 1.14,
    effects: [
      { type: 'coordination_efficiency', value: 0.12, description: '12% better team coordination' },
      { type: 'miscommunication_reduction', value: 0.20, description: '20% fewer communication errors' },
      { type: 'crisis_management', value: 0.15, description: '15% better crisis handling' }
    ],
    rarity: 'common'
  },

  'Problem Solving': {
    id: 'problem_solving',
    name: 'Problem Solving',
    description: 'Expert in quickly identifying and resolving operational issues',
    category: 'dispatcher',
    bonusType: 'performance',
    salaryMultiplier: 1.16,
    effects: [
      { type: 'issue_resolution_time', value: 0.25, description: '25% faster problem resolution' },
      { type: 'prevention', value: 0.10, description: '10% better at preventing future issues' },
      { type: 'cost_savings', value: 0.08, description: '8% cost savings through solutions' }
    ],
    rarity: 'uncommon'
  }
};

// Salary multiplier based on number of skills
export const getSkillsSalaryMultiplier = (skillCount: number): number => {
  if (skillCount <= 1) return 1.0;
  if (skillCount === 2) return 1.05;
  if (skillCount === 3) return 1.12;
  if (skillCount === 4) return 1.20;
  if (skillCount === 5) return 1.30;
  return 1.40; // 6 or more skills
};

// Get all skills by category
export const getSkillsByCategory = (category: 'driver' | 'mechanic' | 'manager' | 'dispatcher'): Skill[] => {
  return Object.values(skillsDatabase).filter(skill => skill.category === category);
};

// Calculate total skill value for a staff member
export const calculateSkillValue = (skills: string[]): {
  totalMultiplier: number;
  combinedEffects: { type: string; value: number; description: string }[];
  skillDetails: Skill[];
} => {
  const skillDetails = skills.map(skillName => skillsDatabase[skillName]).filter(Boolean);
  
  const totalMultiplier = skillDetails.reduce((acc, skill) => acc * skill.salaryMultiplier, 1.0);
  
  const combinedEffects: { type: string; value: number; description: string }[] = [];
  
  skillDetails.forEach(skill => {
    skill.effects.forEach(effect => {
      const existingEffect = combinedEffects.find(e => e.type === effect.type);
      if (existingEffect) {
        existingEffect.value = Math.max(existingEffect.value, effect.value);
      } else {
        combinedEffects.push({ ...effect });
      }
    });
  });
  
  return {
    totalMultiplier,
    combinedEffects,
    skillDetails
  };
};

// Get rarity color for display
export const getRarityColor = (rarity: string): string => {
  switch (rarity) {
    case 'common': return 'text-gray-400 bg-gray-400/10';
    case 'uncommon': return 'text-green-400 bg-green-400/10';
    case 'rare': return 'text-blue-400 bg-blue-400/10';
    case 'expert': return 'text-purple-400 bg-purple-400/10';
    default: return 'text-gray-400 bg-gray-400/10';
  }
};
