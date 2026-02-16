"use client";
import * as React from "react";

import { SearchForm } from "@/components/search-form";
import { VersionSwitcher } from "@/components/version-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";

// This is sample data.
const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    {
      title: "Menus",
      url: "#",
      items: [
        {
          title: "Dashboard",
          url: "/",
          isActive: true,
        },
        {
          title: "Accounts",
          url: "/accounts",
        },
        {
          title: "Transactions",
          url: "/transactions",
        },
        {
          title: "Invoices",
          url: "/invoices",
        },
        {
          title: "Expenses",
          url: "/expenses",
        },
        {
          title: "Reports",
          url: "/reports",
        },
        {
          title: "Recurring",
          url: "/recurring",
        },
        {
          title: "Contacts",
          url: "/contacts",
        },
        {
          title: "Settings",
          url: "/settings",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <VersionSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.url == pathname}>
                      <Link
                        prefetch={true}
                        href={item.url}
                        onClick={() => setOpenMobile(false)}
                      >
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-2">
          <Link
            href="#"
            className=""
            onClick={() => {
              authClient.signOut();
              redirect("/login");
            }}
          >
            Logout
          </Link>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Samuel Kaoma. All rights
            reserved.
          </p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
