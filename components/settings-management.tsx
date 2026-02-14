"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building, User, Plus, Trash2 } from "lucide-react";
import {
  updateCompanyInfo,
  changePassword,
  createUser,
  getUsers,
} from "@/lib/actions/settings";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  type: "staff" | "accountant";
}
export function SettingsManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const [companySettings, setCompanySettings] = useState({
    name: "Your Business Name",
    address: "123 Business Street\nCity, State 12345",
    phone: "+1-555-0123",
    email: "contact@yourbusiness.com",
    website: "www.yourbusiness.com",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    userType: "",
    password: "",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const result = await getUsers();
    if (result.success) {
      setUsers(
        (result.data ?? []).map((user: any) => ({
          ...user,
          type: user.type === "accountant" ? "accountant" : "staff",
        }))
      );
    }
  };

  const handleSaveCompany = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("name", companySettings.name);
    formData.append("address", companySettings.address);
    formData.append("phone", companySettings.phone);
    formData.append("email", companySettings.email);
    formData.append("website", companySettings.website);

    const result = await updateCompanyInfo(formData);

    if (result.success) {
      toast.success(result.data);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("currentPassword", passwordData.currentPassword);
    formData.append("newPassword", passwordData.newPassword);
    formData.append("confirmPassword", passwordData.confirmPassword);

    const result = await changePassword(formData);

    if (result.success) {
      toast.success(result.data);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleCreateUser = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("name", newUser.name);
    formData.append("email", newUser.email);
    formData.append("userType", newUser.userType);
    formData.append("password", newUser.password);

    const result = await createUser(formData);

    if (result.success) {
      toast.success(result.data);
      setNewUser({ name: "", email: "", userType: "", password: "" });
      loadUsers();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  currentPassword: e.target.value,
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={loading}>
              {loading ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
