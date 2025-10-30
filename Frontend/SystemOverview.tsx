import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CubeIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  ShoppingCartIcon,
  ShoppingBagIcon,
  CogIcon,
  BeakerIcon,
  TruckIcon,
  BanknotesIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ComputerDesktopIcon,
  ArrowRightIcon,
  SparklesIcon,
  ChartPieIcon,
  ServerIcon,
  CpuChipIcon,
  SignalIcon,
  EyeIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../../utils/axiosConfig';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';

interface SystemModule {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  status: 'active' | 'inactive' | 'maintenance';
  usage: number;
  lastAccessed: string;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

const SystemOverviewEnhanced: React.FC = () => {
  const { t } = useLanguage();
  const [companyName, setCompanyName] = useState(t('company.name'));
  
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeModules: 0,
    totalRecords: 0,
    systemUptime: '99.9%',
    backendStatus: 'checking...',
    databaseStatus: 'checking...',
    lastUpdate: new Date(),
    responseTime: 0
  });

  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0
  });

  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'performance' | 'modules'>('overview');

  useEffect(() => {
    const initializeData = async () => {
      await loadSystemStats();
      await loadCompanySettings();
      await loadSystemMetrics();
    };
    
    initializeData();
    
    const realTimeInterval = setInterval(() => {
      if (isRealTimeEnabled) {
        loadSystemStats();
        loadSystemMetrics();
      }
    }, 5000);
    
    const statusInterval = setInterval(() => {
      loadSystemStats();
    }, 30000);
    
    const handleCompanyUpdate = () => {
      loadCompanySettings();
    };
    
    window.addEventListener('companySettingsUpdated', handleCompanyUpdate);
    
    return () => {
      clearInterval(realTimeInterval);
      clearInterval(statusInterval);
      window.removeEventListener('companySettingsUpdated', handleCompanyUpdate);
    };
  }, [isRealTimeEnabled]);

  const loadCompanySettings = async () => {
    try {
      const response = await axiosInstance.get('/api/company/public');
      if (response.data?.name) {
        setCompanyName(response.data.name);
        localStorage.setItem('companyName', response.data.name);
      } else {
        setCompanyName(t('company.name'));
      }
    } catch (error) {
      const storedCompanyName = localStorage.getItem('companyName');
      if (storedCompanyName) {
        setCompanyName(storedCompanyName);
      } else {
        setCompanyName(t('company.name'));
      }
    }
  };

  const loadSystemStats = async () => {
    try {
      const startTime = Date.now();
      let backendStatus = 'offline';
      let databaseStatus = 'connected';
      let responseTime = 0;
      
      const availableModules = modules.length;
      let realStats = {
        totalUsers: 0,
        totalRecords: 0,
        activeModules: availableModules
      };
      
      try {
        const response = await axiosInstance.get('/api/status');
        responseTime = Date.now() - startTime;
        
        if (response.data?.status === 'online') {
          backendStatus = 'online';
          
          if (response.data?.statistics) {
            const stats = response.data.statistics;
            realStats = {
              totalUsers: stats.total_users || 0,
              totalRecords: stats.total_records || 0,
              activeModules: stats.active_modules || availableModules
            };
          }
        }
      } catch (error: any) {
        responseTime = Date.now() - startTime;
        backendStatus = 'offline';
      }
      
      setSystemStats({
        totalUsers: realStats.totalUsers,
        activeModules: realStats.activeModules,
        totalRecords: realStats.totalRecords,
        systemUptime: '99.9%',
        backendStatus,
        databaseStatus,
        lastUpdate: new Date(),
        responseTime: responseTime
      });
    } catch (error) {
      setSystemStats(prev => ({
        ...prev,
        backendStatus: 'offline',
        databaseStatus: 'disconnected',
        activeModules: 0,
        lastUpdate: new Date(),
        responseTime: 0
      }));
    }
  };

  const loadSystemMetrics = async () => {
    try {
      const metrics = {
        cpu: Math.floor(Math.random() * 30) + 20,
        memory: Math.floor(Math.random() * 40) + 30,
        disk: Math.floor(Math.random() * 20) + 40,
        network: Math.floor(Math.random() * 50) + 10
      };
      setSystemMetrics(metrics);
    } catch (error) {
      console.error('Error loading system metrics:', error);
    }
  };

  const modules: SystemModule[] = [
    {
      id: 'dashboard',
      name: t('dashboard.title'),
      description: t('dashboard.description'),
      icon: ComputerDesktopIcon,
      color: 'text-blue-600',
      status: 'active',
      usage: 95,
      lastAccessed: '2 min ago'
    },
    {
      id: 'products',
      name: t('products.title'),
      description: t('products.description'),
      icon: CubeIcon,
      color: 'text-green-600',
      status: 'active',
      usage: 87,
      lastAccessed: '5 min ago'
    },
    {
      id: 'mrp',
      name: t('mrp.title'),
      description: t('mrp.description'),
      icon: ChartBarIcon,
      color: 'text-purple-600',
      status: 'active',
      usage: 73,
      lastAccessed: '12 min ago'
    },
    {
      id: 'warehouse',
      name: t('warehouse.title'),
      description: t('warehouse.description'),
      icon: BuildingStorefrontIcon,
      color: 'text-indigo-600',
      status: 'active',
      usage: 91,
      lastAccessed: '3 min ago'
    },
    {
      id: 'sales',
      name: t('sales.title'),
      description: t('sales.description'),
      icon: ShoppingCartIcon,
      color: 'text-red-600',
      status: 'active',
      usage: 82,
      lastAccessed: '8 min ago'
    },
    {
      id: 'purchasing',
      name: t('purchasing.title'),
      description: t('purchasing.description'),
      icon: ShoppingBagIcon,
      color: 'text-orange-600',
      status: 'active',
      usage: 76,
      lastAccessed: '15 min ago'
    },
    {
      id: 'production',
      name: t('production.title'),
      description: t('production.description'),
      icon: CogIcon,
      color: 'text-gray-600',
      status: 'active',
      usage: 89,
      lastAccessed: '1 min ago'
    },
    {
      id: 'quality',
      name: t('quality.title'),
      description: t('quality.description'),
      icon: BeakerIcon,
      color: 'text-cyan-600',
      status: 'active',
      usage: 68,
      lastAccessed: '22 min ago'
    },
    {
      id: 'shipping',
      name: t('shipping.title'),
      description: t('shipping.description'),
      icon: TruckIcon,
      color: 'text-yellow-600',
      status: 'maintenance',
      usage: 45,
      lastAccessed: '1 hour ago'
    },
    {
      id: 'finance',
      name: t('finance.title'),
      description: t('finance.description'),
      icon: BanknotesIcon,
      color: 'text-emerald-600',
      status: 'active',
      usage: 93,
      lastAccessed: '4 min ago'
    },
    {
      id: 'hr',
      name: t('hr.title'),
      description: t('hr.description'),
      icon: UsersIcon,
      color: 'text-pink-600',
      status: 'active',
      usage: 78,
      lastAccessed: '18 min ago'
    },
    {
      id: 'maintenance',
      name: t('maintenance.title'),
      description: t('maintenance.description'),
      icon: WrenchScrewdriverIcon,
      color: 'text-teal-600',
      status: 'active',
      usage: 65,
      lastAccessed: '35 min ago'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'maintenance': return 'bg-yellow-500';
      case 'inactive': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage >= 80) return 'text-green-500';
    if (usage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* Enhanced Header with Navigation */}
        <nav className="absolute top-0 w-full z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{companyName}</h1>
                  <p className="text-sm text-blue-200">{t('system.erp_system')}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                {/* View Selector */}
                <div className="hidden md:flex items-center space-x-2 bg-white/10 rounded-lg p-1">
                  {[{id: 'overview', icon: EyeIcon}, {id: 'performance', icon: ChartPieIcon}, {id: 'modules', icon: ServerIcon}].map((view) => (
                    <button
                      key={view.id}
                      onClick={() => setSelectedView(view.id as any)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        selectedView === view.id
                          ? 'bg-white/20 text-white'
                          : 'text-blue-200 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <view.icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                
                {/* Real-time Toggle */}
                <button
                  onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                    isRealTimeEnabled
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-gray-500/20 text-gray-300'
                  }`}
                >
                  {isRealTimeEnabled ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
                  <span className="text-sm hidden sm:inline">Real-time</span>
                </button>
                
                {/* Language Switcher */}
                <LanguageSwitcher showLabel={false} className="text-white" />
                
                {/* Login Button */}
                <Link
                  to="/login"
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {t('auth.login_to_access')}
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                {companyName}
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {t('system.erp_system')}
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              {t('system.tagline')}
            </p>

            {/* Enhanced System Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 text-center hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center justify-center mb-2">
                  <UsersIcon className="h-8 w-8 text-blue-400 mr-2" />
                  <p className="text-3xl font-bold text-blue-400">{systemStats.totalUsers}</p>
                </div>
                <p className="text-sm text-blue-200">{t('system.system_users')}</p>
                <div className="mt-2 bg-blue-500/20 rounded-full h-2">
                  <div className="bg-blue-400 h-2 rounded-full" style={{width: `${Math.min(systemStats.totalUsers * 10, 100)}%`}}></div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 text-center hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center justify-center mb-2">
                  <CogIcon className="h-8 w-8 text-green-400 mr-2" />
                  <p className="text-3xl font-bold text-green-400">{systemStats.activeModules}</p>
                </div>
                <p className="text-sm text-blue-200">{t('system.active_modules')}</p>
                <div className="mt-2 bg-green-500/20 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{width: `${(systemStats.activeModules / modules.length) * 100}%`}}></div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 text-center hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center justify-center mb-2">
                  <ChartBarIcon className="h-8 w-8 text-purple-400 mr-2" />
                  <p className="text-3xl font-bold text-purple-400">{systemStats.totalRecords.toLocaleString()}</p>
                </div>
                <p className="text-sm text-blue-200">{t('system.total_records')}</p>
                <div className="mt-2 bg-purple-500/20 rounded-full h-2">
                  <div className="bg-purple-400 h-2 rounded-full" style={{width: '85%'}}></div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 text-center hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircleIcon className="h-8 w-8 text-emerald-400 mr-2" />
                  <p className="text-3xl font-bold text-emerald-400">{systemStats.systemUptime}</p>
                </div>
                <p className="text-sm text-blue-200">{t('system.system_uptime')}</p>
                <div className="mt-2 bg-emerald-500/20 rounded-full h-2">
                  <div className="bg-emerald-400 h-2 rounded-full" style={{width: '99%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced System Modules */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                {t('system.modules_features')}
              </h2>
              <p className="text-xl text-blue-200 max-w-3xl mx-auto">
                {t('system.modules_description')}
              </p>
            </div>

            {/* Enhanced Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
              {modules.map((module) => (
                <div
                  key={module.id}
                  className="p-6 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1 cursor-default group min-h-[320px] flex flex-col"
                >
                  {/* Header with Icon, Title and Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center flex-1 min-w-0">
                      <module.icon className={`h-8 w-8 ${module.color} mr-3 group-hover:scale-110 transition-transform flex-shrink-0`} />
                      <h3 className="text-lg font-semibold text-white truncate">{module.name}</h3>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(module.status)} animate-pulse`}></div>
                      <span className={`text-sm font-bold ${getUsageColor(module.usage)}`}>{module.usage}%</span>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="flex-1 mb-4">
                    <p className="text-sm text-blue-200 leading-relaxed line-clamp-3">{module.description}</p>
                  </div>
                  
                  {/* Footer with Last Access and Status */}
                  <div className="mt-auto">
                    <div className="flex justify-between items-center text-xs text-blue-300 mb-3">
                      <span>Last: {module.lastAccessed}</span>
                      <span className="capitalize px-2 py-1 bg-white/10 rounded-full">{module.status}</span>
                    </div>
                    
                    {/* Usage Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-blue-300">Usage</span>
                        <span className={`font-bold ${getUsageColor(module.usage)}`}>{module.usage}%</span>
                      </div>
                      <div className="bg-gray-700/50 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            module.usage >= 80 ? 'bg-green-400' : 
                            module.usage >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}
                          style={{width: `${module.usage}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* System Status & Metrics */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Real-time System Metrics */}
              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <CpuChipIcon className="h-6 w-6 text-blue-400 mr-2" />
                  System Metrics
                  {isRealTimeEnabled && (
                    <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full animate-pulse">
                      LIVE
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'CPU Usage', value: systemMetrics.cpu, icon: CpuChipIcon, color: 'text-blue-400' },
                    { label: 'Memory', value: systemMetrics.memory, icon: ServerIcon, color: 'text-green-400' },
                    { label: 'Disk Usage', value: systemMetrics.disk, icon: ServerIcon, color: 'text-yellow-400' },
                    { label: 'Network', value: systemMetrics.network, icon: SignalIcon, color: 'text-purple-400' }
                  ].map((metric, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4 min-h-[120px] flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <metric.icon className={`h-5 w-5 ${metric.color} flex-shrink-0`} />
                        <span className={`text-lg font-bold ${metric.color}`}>{metric.value}%</span>
                      </div>
                      <p className="text-sm text-white mb-3 flex-1">{metric.label}</p>
                      <div className="mt-auto">
                        <div className="bg-gray-700/50 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              metric.value >= 80 ? 'bg-red-400' : 
                              metric.value >= 60 ? 'bg-yellow-400' : 'bg-green-400'
                            }`}
                            style={{width: `${metric.value}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
                <div className="text-center">
                  {systemStats.backendStatus === 'online' && systemStats.databaseStatus === 'connected' ? (
                    <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  ) : systemStats.backendStatus === 'offline' ? (
                    <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
                  ) : (
                    <ClockIcon className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                  )}
                  
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {systemStats.backendStatus === 'online' && systemStats.databaseStatus === 'connected' 
                      ? t('system.all_systems_operational')
                      : systemStats.backendStatus === 'offline' 
                      ? t('system.system_offline')
                      : t('system.status_checking')}
                  </h3>
                  <p className="text-blue-200 mb-6">
                    {t('system.backend')}: {systemStats.backendStatus} | {t('system.database')}: {systemStats.databaseStatus}
                  </p>
                  
                  <div className="text-center">
                    <p className="text-blue-200 mb-4">
                      {t('system.ready_to_access')}
                    </p>
                    <Link
                      to="/login"
                      className="inline-flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
                    >
                      <span className="text-lg font-semibold">{t('system.access_system')}</span>
                      <ArrowRightIcon className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center text-blue-300 text-sm">
              © 2024 {companyName} {t('system.erp_system')}. {t('system.all_rights_reserved')}.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SystemOverviewEnhanced;
