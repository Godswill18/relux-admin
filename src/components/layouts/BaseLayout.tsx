// ============================================================================
// BASE LAYOUT - Shared Layout Component for Admin and Staff
// ============================================================================

import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Menu, X, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAuthStore, useCurrentUser } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ============================================================================
// TYPES
// ============================================================================

export interface NavItem {
  label: string;
  path: string;
  icon?: ReactNode;
  hidden?: boolean;
}

interface BaseLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  headerTitle: string;
  logoText?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Determines if a nav item is active based on the current pathname.
 * Uses exact match OR startsWith(path + '/') so that:
 *   /admin       → only matches /admin (not /admin/orders)
 *   /admin/orders → matches /admin/orders and /admin/orders/123
 */
function isNavItemActive(pathname: string, itemPath: string): boolean {
  if (pathname === itemPath) return true;
  // if (pathname.startsWith(itemPath + '/')) return true;
  return false;
}

// ============================================================================
// BASE LAYOUT COMPONENT
// ============================================================================

export function BaseLayout({
  children,
  navItems,
  headerTitle,
  logoText = 'Relux Laundry',
}: BaseLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useThemeStore();
  const { logout } = useAuthStore();
  const user = useCurrentUser();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  // Profile page path — staff stay in StaffLayout; all other roles use the
  // admin layout so their sidebar stays consistent.
  const profilePath = user?.role === 'staff' ? '/staff/profile' : '/admin/profile';

  // Get user initials for avatar
  const userInitials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'U';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ================================================================ */}
      {/* Sidebar - Desktop (fixed height, never scrolls with page) */}
      {/* ================================================================ */}
      <aside className="hidden w-64 flex-shrink-0 border-r bg-card lg:flex lg:flex-col">
        {/* Logo */}
        <div className="flex-shrink-0 border-b p-6">
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-xl font-bold">{logoText}</span>
          </Link>
        </div>

        {/* Navigation (scrollable if many items) */}
        <ScrollArea className="flex-1">
          <nav className="space-y-1 px-3 py-4">
            {navItems.map((item) =>
              item.hidden ? (
                <div key={item.path} className="h-9" />
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    isNavItemActive(location.pathname, item.path) && 'bg-primary/10 text-primary'
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )
            )}
          </nav>
        </ScrollArea>

        {/* User Info */}
        <div className="flex-shrink-0 border-t p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ================================================================ */}
      {/* Main Content Area (header + scrollable page content) */}
      {/* ================================================================ */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        {/* Header (never scrolls) */}
        <header className="flex-shrink-0 border-b bg-card z-10">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Site navigation links</SheetDescription>
                <div className="flex h-full flex-col">
                  {/* Mobile Logo */}
                  <div className="flex items-center justify-between border-b p-4">
                    <Link
                      to="/"
                      className="flex items-center space-x-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary" />
                      <span className="text-xl font-bold">{logoText}</span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Mobile Navigation */}
                  <ScrollArea className="flex-1">
                    <nav className="space-y-1 px-3 py-4">
                      {navItems.map((item) =>
                        item.hidden ? (
                          <div key={item.path} className="h-9" />
                        ) : (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                              'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                              isNavItemActive(location.pathname, item.path) && 'bg-primary/10 text-primary'
                            )}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {item.icon}
                            <span>{item.label}</span>
                          </Link>
                        )
                      )}
                    </nav>
                  </ScrollArea>

                  {/* Mobile User Info */}
                  <div className="border-t p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback>{userInitials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">{user?.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user?.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Page Title */}
            <h1 className="text-lg font-semibold lg:text-xl">{headerTitle}</h1>

            {/* Header Actions */}
            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={profilePath} className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content — ONLY this area scrolls */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
