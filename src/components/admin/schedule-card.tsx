'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AsyncButton } from '@/components/ui/async-button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { BarChart3, Plus, Edit, Trash2 } from 'lucide-react'

interface Schedule {
    id: string
    time: string
    label: string
    slots: number
    category: string | null
    isActive: boolean
    lastRunDate: string | null
}

// All 7 categories, per explicit request - the old form only offered a
// generic "Target Articles/Category" number with no way to scope a slot to
// one specific category at all.
const CATEGORIES = ['TOURISM', 'GOVERNMENT', 'INVESTMENT', 'INCIDENTS', 'LOCAL', 'JOBS', 'OPINION']
const ALL_CATEGORIES_VALUE = '__all__'

export function ScheduleCard() {
    const { toast } = useToast()
    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
    const [formData, setFormData] = useState({
        time: '08:00',
        label: 'General Update',
        slots: 2,
        category: ALL_CATEGORIES_VALUE,
        isActive: true
    })

    useEffect(() => {
        fetchSchedules()
    }, [])

    async function fetchSchedules() {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/schedule')
            const data = await res.json()
            if (data.success) {
                setSchedules(data.schedules)
            }
        } catch (e) {
            console.error('Failed to fetch schedule', e)
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        try {
            const method = editingSchedule ? 'PUT' : 'POST'
            const payload = {
                ...formData,
                category: formData.category === ALL_CATEGORIES_VALUE ? null : formData.category,
            }
            const body = editingSchedule ? { ...payload, id: editingSchedule.id } : payload

            const res = await fetch('/api/admin/schedule', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (res.ok) {
                toast({ title: 'Berhasil', description: editingSchedule ? 'Jadwal diperbarui!' : 'Jadwal ditambahkan!' })
                setIsDialogOpen(false)
                setEditingSchedule(null)
                fetchSchedules()
            } else {
                toast({ title: 'Gagal', description: 'Gagal menyimpan jadwal', variant: 'destructive' })
            }
        } catch (e) {
            console.error('Failed to save', e)
            toast({ title: 'Gagal', description: 'Gagal menyimpan jadwal', variant: 'destructive' })
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this schedule?')) return
        try {
            const res = await fetch(`/api/admin/schedule?id=${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
            toast({ title: 'Berhasil', description: 'Jadwal dihapus!' })
            fetchSchedules()
        } catch (e) {
            console.error('Failed to delete', e)
            toast({ title: 'Gagal', description: 'Gagal menghapus jadwal', variant: 'destructive' })
        }
    }

    return (
        <Card className="border-indigo-500/20 bg-indigo-50/10 h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-indigo-500" />
                            Smart Schedule (Editable)
                        </CardTitle>
                        <CardDescription>
                            Setiap slot dijalankan otomatis oleh cron (tiap 10 menit, WITA) tepat di jam yang diatur.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="space-y-3">
                    {schedules.map((schedule) => {
                        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
                        const ranToday = schedule.lastRunDate === today
                        return (
                            <div key={schedule.id} className="flex items-center justify-between p-3 border rounded bg-background/60">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-sm px-2 py-1">{schedule.time}</Badge>
                                    <div>
                                        <p className="text-sm font-medium">{schedule.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {schedule.slots} artikel • {schedule.category || 'Semua Kategori'}
                                            {ranToday && ' • ✓ sudah jalan hari ini'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                            setEditingSchedule(schedule)
                                            setFormData({
                                                time: schedule.time,
                                                label: schedule.label,
                                                slots: schedule.slots,
                                                category: schedule.category || ALL_CATEGORIES_VALUE,
                                                isActive: schedule.isActive
                                            })
                                            setIsDialogOpen(true)
                                        }}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AsyncButton
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-700"
                                        onClick={() => handleDelete(schedule.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </AsyncButton>
                                    <Badge className={schedule.isActive ? "bg-green-500" : "bg-zinc-500"}>
                                        {schedule.isActive ? 'Active' : 'Off'}
                                    </Badge>
                                </div>
                            </div>
                        )
                    })}

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full mt-2 border-dashed" onClick={() => {
                                setEditingSchedule(null)
                                setFormData({
                                    time: '08:00',
                                    label: 'New Schedule',
                                    slots: 2,
                                    category: ALL_CATEGORIES_VALUE,
                                    isActive: true
                                })
                            }}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Schedule Slot
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Waktu (24h, WITA)</Label>
                                    <Input
                                        type="time"
                                        value={formData.time}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Label</Label>
                                    <Input
                                        value={formData.label}
                                        onChange={e => setFormData({ ...formData, label: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Kategori</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(v) => setFormData({ ...formData, category: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={ALL_CATEGORIES_VALUE}>Semua Kategori (acak)</SelectItem>
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Pilih 1 kategori spesifik, atau "Semua Kategori" untuk distribusi acak seperti generator harian biasa.
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Jumlah Artikel</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={formData.slots}
                                        onChange={e => setFormData({ ...formData, slots: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label>Active</Label>
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="h-4 w-4"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <AsyncButton onClick={handleSave}>Save</AsyncButton>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    )
}
