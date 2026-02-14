"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building,
  Plus,
  Search,
} from "lucide-react";
import {
  createContact,
  updateContact,
  deleteContact,
} from "@/lib/actions/contacts";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  type: "customer" | "vendor";
  taxId?: string | null;
  balance: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ContactsSummary {
  totalContacts: number;
  customers: number;
  vendors: number;
  totalCustomerBalance: number;
  totalVendorBalance: number;
}

interface ContactManagementProps {
  initialContacts: Contact[];
  initialSummary: ContactsSummary | null;
}

export function ContactManagement({
  initialContacts,
  initialSummary,
}: ContactManagementProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    type: "customer" as "customer" | "vendor",
    taxId: "",
    notes: "",
  });

  const filteredContacts = initialContacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || contact.type === filterType;
    const matchesTab = activeTab === "all" || contact.type === activeTab;
    return matchesSearch && matchesType && matchesTab && contact.isActive;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const formDataObj = new FormData();
      formDataObj.append("name", formData.name);
      formDataObj.append("email", formData.email);
      formDataObj.append("phone", formData.phone);
      formDataObj.append("address", formData.address);
      formDataObj.append("type", formData.type);
      formDataObj.append("taxId", formData.taxId);

      let result;
      if (editingContact) {
        result = await updateContact(editingContact.id, formDataObj);
      } else {
        result = await createContact(formDataObj);
      }

      if (result.success) {
        toast.success(
          `Contact ${editingContact ? "updated" : "created"} successfully`
        );
        setIsDialogOpen(false);
        resetForm();
        router.refresh();
      } else {
        toast.error(
          result.error ||
            `Failed to ${editingContact ? "update" : "create"} contact`
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(`Failed to ${editingContact ? "update" : "create"} contact`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    try {
      setLoading(true);
      const result = await deleteContact(contactId);

      if (result.success) {
        toast.success("Contact deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete contact");
      }
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to delete contact");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      type: "customer",
      taxId: "",
      notes: "",
    });
    setEditingContact(null);
  };

  const getTypeColor = (type: string) => {
    return type === "customer"
      ? "bg-green-100 text-green-800"
      : "bg-blue-100 text-blue-800";
  };

  const ContactCard = ({ contact }: { contact: Contact }) => (
    <Card key={contact.id}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{contact.name}</h3>
              <Badge className={getTypeColor(contact.type)}>
                {contact.type}
              </Badge>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{contact.address}</span>
                </div>
              )}
              {contact.taxId && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>Tax ID: {contact.taxId}</span>
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-4 text-sm">
              <div>
                <span className="text-muted-foreground">Balance:</span>
                <span className="font-medium ml-1">
                  K{Number.parseFloat(contact.balance || "0").toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingContact(contact);
                setFormData({
                  name: contact.name,
                  email: contact.email || "",
                  phone: contact.phone || "",
                  address: contact.address || "",
                  type: contact.type,
                  taxId: contact.taxId || "",
                  notes: "",
                });
                setIsDialogOpen(true);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(contact.id)}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your customers and vendors
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingContact(null);
                resetForm();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? "Edit Contact" : "Create New Contact"}
                </DialogTitle>
                <DialogDescription>
                  {editingContact
                    ? "Update the contact details below."
                    : "Add a new contact to your records."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Contact name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "customer" | "vendor") =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Street address, city, state, zip"
                  />
                </div>

                <div>
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) =>
                      setFormData({ ...formData, taxId: e.target.value })
                    }
                    placeholder="Tax identification number"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {editingContact ? "Update Contact" : "Create Contact"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {initialSummary?.totalContacts || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active contacts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {initialSummary?.customers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              K{initialSummary?.totalCustomerBalance?.toLocaleString() || 0}{" "}
              balance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {initialSummary?.vendors || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              K{initialSummary?.totalVendorBalance?.toLocaleString() || 0}{" "}
              balance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              K
              {(
                (initialSummary?.totalCustomerBalance || 0) -
                (initialSummary?.totalVendorBalance || 0)
              ).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Customer - Vendor</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Contacts</TabsTrigger>
          <TabsTrigger value="customer">Customers</TabsTrigger>
          <TabsTrigger value="vendor">Vendors</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contacts found
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))
          )}
        </TabsContent>
        <TabsContent value="customer" className="space-y-4">
          {filteredContacts.filter((c) => c.type === "customer").length ===
          0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No customers found
            </div>
          ) : (
            filteredContacts
              .filter((c) => c.type === "customer")
              .map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))
          )}
        </TabsContent>
        <TabsContent value="vendor" className="space-y-4">
          {filteredContacts.filter((c) => c.type === "vendor").length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vendors found
            </div>
          ) : (
            filteredContacts
              .filter((c) => c.type === "vendor")
              .map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
