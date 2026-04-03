"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, Button, Input, Select, StatusBadge, Modal } from "@/components/ui";
import { Plus, Search, Edit, UserX } from "lucide-react";
import toast from "react-hot-toast";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  designation: string;
  biometricId: string;
  phone: string;
  isActive: boolean;
  joiningDate: string;
  manager?: { id: string; name: string };
  hr?: { id: string; name: string };
}

const roles = [
  { value: "EMPLOYEE", label: "Employee" },
  { value: "MANAGER", label: "Manager" },
  { value: "HR", label: "HR" },
  { value: "ADMIN", label: "Admin" },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [allEmployees, setAllEmployees] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    biometricId: "",
    department: "",
    designation: "",
    phone: "",
    managerId: "",
    hrId: "",
    joiningDate: "",
  });
  const [saving, setSaving] = useState(false);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await api.getEmployees(params.toString());
      setEmployees(res.data.employees);
      setAllEmployees(
        res.data.employees.map((e: Employee) => ({ id: e.id, name: e.name }))
      );
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadEmployees();
  };

  const openCreate = () => {
    setEditingEmployee(null);
    setForm({
      name: "",
      email: "",
      password: "",
      role: "EMPLOYEE",
      biometricId: "",
      department: "",
      designation: "",
      phone: "",
      managerId: "",
      hrId: "",
      joiningDate: "",
    });
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({
      name: emp.name,
      email: emp.email,
      password: "",
      role: emp.role,
      biometricId: emp.biometricId || "",
      department: emp.department || "",
      designation: emp.designation || "",
      phone: emp.phone || "",
      managerId: emp.manager?.id || "",
      hrId: emp.hr?.id || "",
      joiningDate: emp.joiningDate
        ? new Date(emp.joiningDate).toISOString().split("T")[0]
        : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data: Record<string, unknown> = { ...form };
      if (!data.password) delete data.password;
      if (!data.managerId) delete data.managerId;
      if (!data.hrId) delete data.hrId;

      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, data);
        toast.success("Employee updated");
      } else {
        if (!form.password) {
          toast.error("Password is required");
          setSaving(false);
          return;
        }
        await api.createEmployee(data);
        toast.success("Employee created");
      }
      setShowModal(false);
      loadEmployees();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this employee?")) return;
    try {
      await api.deleteEmployee(id);
      toast.success("Employee deactivated");
      loadEmployees();
    } catch {
      toast.error("Failed to deactivate");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, email, or biometric ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </form>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Name</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Role</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Department</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Biometric ID</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Manager</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">{emp.name}</td>
                    <td className="py-3 px-2 text-gray-600">{emp.email}</td>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{emp.department || "—"}</td>
                    <td className="py-3 px-2 text-gray-600">{emp.biometricId || "—"}</td>
                    <td className="py-3 px-2 text-gray-600">{emp.manager?.name || "—"}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${emp.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(emp)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {emp.isActive && (
                          <button
                            onClick={() => handleDeactivate(emp.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                            title="Deactivate"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Employee Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEmployee ? "Edit Employee" : "Add Employee"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={editingEmployee ? "New Password (leave blank to keep)" : "Password"}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editingEmployee}
            />
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={roles}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Biometric ID"
              value={form.biometricId}
              onChange={(e) => setForm({ ...form, biometricId: e.target.value })}
              placeholder="eSSL User ID"
            />
            <Input
              label="Department"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Designation"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Manager"
              value={form.managerId}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
              options={[
                { value: "", label: "Select Manager" },
                ...allEmployees.map((e) => ({ value: e.id, label: e.name })),
              ]}
            />
            <Select
              label="HR"
              value={form.hrId}
              onChange={(e) => setForm({ ...form, hrId: e.target.value })}
              options={[
                { value: "", label: "Select HR" },
                ...allEmployees.map((e) => ({ value: e.id, label: e.name })),
              ]}
            />
          </div>

          <Input
            label="Joining Date"
            type="date"
            value={form.joiningDate}
            onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingEmployee ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
