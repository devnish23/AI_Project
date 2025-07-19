import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  HomeIcon, 
  CubeIcon, 
  CloudArrowUpIcon, 
  DocumentChartBarIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  WrenchScrewdriverIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  onApplicationsClick?: () => void;
  onPatchMgmtClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [patchMgmtOpen, setPatchMgmtOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Applications', icon: CubeIcon, onClick: () => navigate('/applications', { state: { tab: 'applications' } }) },
    // Patch Management dropdown
    {
      name: 'Patch Management',
      icon: WrenchScrewdriverIcon,
      isDropdown: true,
      open: patchMgmtOpen,
      onClick: () => setPatchMgmtOpen(open => !open),
      children: [
        { name: 'Red Hat', href: '/patchmgmt/redhat' },
        { name: 'Windows', href: '/patchmgmt/windows' },
        { name: 'ESXi', href: '/patchmgmt/esxi' },
        { name: 'vCenter', href: '/patchmgmt/vcenter' },
        { name: 'CyberArk', href: '/patchmgmt/cyberark' },
        { name: 'RSA', href: '/patchmgmt/rsa' },
        { name: 'SolarWinds', href: '/patchmgmt/solarwinds' },
        { name: 'McAfee', href: '/patchmgmt/mcafee' },
        { name: 'Nessus', href: '/patchmgmt/nessus' },
      ]
    },
    { name: 'Bulk Upload', icon: CloudArrowUpIcon, onClick: () => navigate('/applications', { state: { tab: 'bulkupload' } }) },
    { name: 'Advisory Dashboard', href: '/advisory-dashboard', icon: HomeIcon },
    { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
    { name: 'Schedule', icon: ClockIcon, onClick: () => navigate('/schedule') },
  ];

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Infra Tracker
            </h1>
          </div>
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              item.isDropdown ? (
                <div key={item.name} className="group">
                  <button
                    onClick={item.onClick}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white`}
                  >
                    {item.icon && <item.icon className="mr-3 flex-shrink-0 h-6 w-6" />}
                    {item.name}
                    <span className="ml-auto">{item.open ? '▲' : '▼'}</span>
                  </button>
                  {item.open && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children.map((child: { name: string; href: string }) => (
                        <NavLink
                          key={child.name}
                          to={child.href || '#'}
                          className={({ isActive }) =>
                            `block px-2 py-1 text-sm rounded-md ${
                              isActive
                                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                            }`
                          }
                        >
                          {child.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  key={item.name}
                  to={item.href || '#'}
                  className={({ isActive }) =>
                    `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                    }`
                  }
                  onClick={item.onClick}
                >
                  {item.icon && <item.icon className="mr-3 flex-shrink-0 h-6 w-6" />}
                  {item.name}
                </NavLink>
              )
            ))}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={toggleTheme}
            className="flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            {theme === 'dark' ? (
              <SunIcon className="mr-3 h-6 w-6" />
            ) : (
              <MoonIcon className="mr-3 h-6 w-6" />
            )}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 