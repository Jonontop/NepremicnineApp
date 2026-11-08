"use client";

import React from "react";
import DashboardContent from "../dashboard/DashboardContent";

/**
 * Admin control panel — accessible only via /admin URL.
 * Not linked from any navigation menu.
 */
export default function AdminPage() {
  return <DashboardContent />;
}
