"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { UserPlus, KeyRound, Pencil, Trash2 } from "lucide-react";

export type UserItem = {
  id: number;
  login: string;
  full_name: string;
  act_name: string;
  role: "admin" | "specialist";
  is_active: number;
  acts_count: number;
};

export function UsersAdmin({
  users,
  selfId,
}: {
  users: UserItem[];
  selfId: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    login: "",
    full_name: "",
    act_name: "",
    password: "",
    role: "specialist",
  });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState({
    login: "",
    full_name: "",
    act_name: "",
    role: "specialist",
  });

  function startEdit(user: UserItem) {
    setEditForm({
      login: user.login,
      full_name: user.full_name,
      act_name: user.act_name || "",
      role: user.role,
    });
    setEditing(user);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...editForm }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Ошибка");
        return;
      }
      toast.success("Данные сотрудника обновлены");
      setEditing(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(user: UserItem) {
    if (
      !confirm(
        `Удалить сотрудника «${user.full_name}» (логин ${user.login})? Действие необратимо.`
      )
    ) {
      return;
    }
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Ошибка");
      return;
    }
    toast.success(`Сотрудник ${user.full_name} удалён`);
    router.refresh();
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Ошибка");
        return;
      }
      toast.success(`Сотрудник ${form.full_name} добавлен`);
      setOpen(false);
      setForm({
        login: "",
        full_name: "",
        act_name: "",
        password: "",
        role: "specialist",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(user: UserItem) {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Ошибка");
      return;
    }
    toast.success(
      user.is_active
        ? `Доступ для ${user.full_name} закрыт`
        : `Доступ для ${user.full_name} открыт`
    );
    router.refresh();
  }

  async function resetPassword(user: UserItem) {
    const password = prompt(`Новый пароль для ${user.login} (мин. 8 символов):`);
    if (!password) return;
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Ошибка");
      return;
    }
    toast.success("Пароль обновлён");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
                <UserPlus className="size-4" />
                Добавить сотрудника
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Новый сотрудник</DialogTitle>
            </DialogHeader>
            <form onSubmit={createUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nu-name">ФИО</Label>
                <Input
                  id="nu-name"
                  placeholder="Курганский Никита"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nu-act-name">ФИО в тексте акта</Label>
                <Input
                  id="nu-act-name"
                  placeholder="Курганским Никитой"
                  value={form.act_name}
                  onChange={(e) =>
                    setForm({ ...form, act_name: e.target.value })
                  }
                />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  В творительном падеже (кем?) — попадает в фразу «акт
                  составлен сервисным специалистом{" "}
                  <span className="font-medium">
                    {form.act_name || "Курганским Никитой"}
                  </span>
                  ». Например: Юрием Марченко, Курганским Никитой.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nu-login">Логин</Label>
                <Input
                  id="nu-login"
                  placeholder="nikita"
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nu-pass">Пароль (мин. 8 символов)</Label>
                <Input
                  id="nu-pass"
                  type="text"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nu-role">Роль</Label>
                <select
                  id="nu-role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
                >
                  <option value="specialist">Специалист</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Сохраняем…" : "Создать"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass overflow-hidden border-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ФИО</TableHead>
              <TableHead>Логин</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Актов</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {u.login}
                </TableCell>
                <TableCell>
                  {u.role === "admin" ? (
                    <Badge>Администратор</Badge>
                  ) : (
                    <Badge variant="secondary">Специалист</Badge>
                  )}
                </TableCell>
                <TableCell>{u.acts_count}</TableCell>
                <TableCell>
                  {u.is_active ? (
                    <Badge variant="outline" className="text-green-700">
                      Активен
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Отключён
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="space-x-1 text-right whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(u)}
                  >
                    <Pencil className="size-4" />
                    Изменить
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetPassword(u)}
                  >
                    <KeyRound className="size-4" />
                    Пароль
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={u.id === selfId}
                    onClick={() => toggleActive(u)}
                  >
                    {u.is_active ? "Отключить" : "Включить"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    disabled={u.id === selfId || u.acts_count > 0}
                    title={
                      u.acts_count > 0
                        ? "У сотрудника есть акты — удалить нельзя, используйте «Отключить»"
                        : u.id === selfId
                          ? "Нельзя удалить самого себя"
                          : "Удалить"
                    }
                    onClick={() => deleteUser(u)}
                    aria-label="Удалить"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Диалог редактирования сотрудника */}
      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Сотрудник: {editing?.full_name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eu-name">ФИО</Label>
              <Input
                id="eu-name"
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, full_name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eu-act-name">ФИО в тексте акта</Label>
              <Input
                id="eu-act-name"
                placeholder="Курганским Никитой"
                value={editForm.act_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, act_name: e.target.value })
                }
              />
              <p className="text-muted-foreground text-xs leading-relaxed">
                В творительном падеже (кем?) — «акт составлен сервисным
                специалистом{" "}
                <span className="font-medium">
                  {editForm.act_name || "Курганским Никитой"}
                </span>
                ».
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eu-login">Логин</Label>
              <Input
                id="eu-login"
                value={editForm.login}
                onChange={(e) =>
                  setEditForm({ ...editForm, login: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eu-role">Роль</Label>
              <select
                id="eu-role"
                value={editForm.role}
                onChange={(e) =>
                  setEditForm({ ...editForm, role: e.target.value })
                }
                disabled={editing?.id === selfId}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs disabled:opacity-50"
              >
                <option value="specialist">Специалист</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Сохраняем…" : "Сохранить"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
