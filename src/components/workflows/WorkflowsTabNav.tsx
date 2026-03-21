import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { label: 'Workflows', href: '/workflows' },
  { label: 'Automation Rules', href: '/workflows/automation' },
  { label: 'Workflow Builder', href: '/workflows/builder' },
];

export function WorkflowsTabNav() {
  const location = useLocation();

  return (
    <div className="sticky top-0 z-10 bg-background flex border-b border-gray-200 dark:border-gray-700 mb-6">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.href;
        return (
          <Link
            key={tab.href}
            to={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
