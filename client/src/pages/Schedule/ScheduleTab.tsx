import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaPlay, FaEdit, FaTrash } from 'react-icons/fa';

const scriptOptions = [
  { value: 'scrapeRedHatAdvisories', label: 'Red Hat Advisories Scraper' },
  { value: 'fetchRedHatData', label: 'Red Hat API Fetcher' },
  // Add more scripts as needed
];

const frequencyOptions = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'dayOfMonth', label: 'Day of the Month' },
  { value: 'dayOfWeek', label: 'Day of the Week' },
  { value: 'custom', label: 'Custom (Cron)' },
];

const daysOfWeek = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

interface CronParams {
  frequency: string;
  time: string;
  dayOfMonth: string;
  dayOfWeek: string;
  customCron: string;
}

function getCron({ frequency, time, dayOfMonth, dayOfWeek, customCron }: CronParams) {
  const [hour, minute] = time.split(':');
  switch (frequency) {
    case 'hourly': return `0 * * * *`;
    case 'daily': return `${minute} ${hour} * * *`;
    case 'weekly': return `${minute} ${hour} * * 0`;
    case 'monthly': return `${minute} ${hour} ${dayOfMonth} * *`;
    case 'dayOfMonth': return `${minute} ${hour} ${dayOfMonth} * *`;
    case 'dayOfWeek': return `${minute} ${hour} * * ${daysOfWeek.indexOf(dayOfWeek)}`;
    case 'custom': return customCron;
    default: return '* * * * *';
  }
}

const ScheduleTab: React.FC = () => {
  const [selectedScript, setSelectedScript] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [time, setTime] = useState('00:00');
  const [customCron, setCustomCron] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const scriptSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { fetchSchedules(); }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    const res = await axios.get('/api/schedule');
    setSchedules(res.data);
    setLoading(false);
  };

  const handleSave = async () => {
    const cron = getCron({ frequency, time, dayOfMonth, dayOfWeek, customCron });
    const schedule = {
      _id: editingId || undefined,
      script: selectedScript,
      cron,
      enabled: true,
      frequency,
      time,
      dayOfMonth,
      dayOfWeek,
      customCron
    };
    await axios.post('/api/schedule', schedule);
    setEditingId(null);
    setSelectedScript('');
    setFrequency('daily');
    setTime('00:00');
    setCustomCron('');
    setDayOfMonth('1');
    setDayOfWeek('Monday');
    setShowForm(false);
    fetchSchedules();
  };

  const handleAddNew = () => {
    setEditingId(null);
    setSelectedScript('');
    setFrequency('daily');
    setTime('00:00');
    setCustomCron('');
    setDayOfMonth('1');
    setDayOfWeek('Monday');
    setShowForm(true);
    setTimeout(() => {
      scriptSelectRef.current?.focus();
    }, 100);
  };

  const handleEdit = (sch: any) => {
    setEditingId(sch._id);
    setSelectedScript(sch.script);
    setFrequency(sch.frequency || 'custom');
    setTime(sch.time || '00:00');
    setCustomCron(sch.customCron || '');
    setDayOfMonth(sch.dayOfMonth || '1');
    setDayOfWeek(sch.dayOfWeek || 'Monday');
    setShowForm(true);
    setTimeout(() => {
      scriptSelectRef.current?.focus();
    }, 100);
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      alert('Invalid schedule ID');
      return;
    }
    await axios.delete(`/api/schedule/${id}`);
    fetchSchedules();
  };

  const handleRunNow = async (id: string) => {
    if (!id) {
      alert('Invalid schedule ID');
      return;
    }
    await axios.post(`/api/schedule/${id}/run`);
    alert('Script executed!');
  };

  return (
    <div className="p-4 max-w-lg text-left">
      <button
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={handleAddNew}
      >
        Add New Schedule
      </button>
      {showForm && (
        <div className="mb-8 border p-4 rounded bg-white shadow">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Schedule' : 'Add New Schedule'}</h2>
          <label className="block mb-2 font-medium">Script</label>
          <select
            ref={scriptSelectRef}
            className="border rounded px-3 py-2 mb-4 w-full"
            value={selectedScript}
            onChange={e => setSelectedScript(e.target.value)}
          >
            <option value="">Select a script</option>
            {scriptOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <label className="block mb-2 font-medium">Frequency</label>
          <select
            className="border rounded px-3 py-2 mb-4 w-full"
            value={frequency}
            onChange={e => setFrequency(e.target.value)}
          >
            {frequencyOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {(frequency === 'daily' || frequency === 'weekly') && (
            <>
              <label className="block mb-2 font-medium">Time</label>
              <input
                type="time"
                className="border rounded px-3 py-2 mb-4 w-full"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </>
          )}

          {frequency === 'monthly' && (
            <>
              <label className="block mb-2 font-medium">Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                className="border rounded px-3 py-2 mb-4 w-full"
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value)}
              />
              <label className="block mb-2 font-medium">Time</label>
              <input
                type="time"
                className="border rounded px-3 py-2 mb-4 w-full"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </>
          )}

          {frequency === 'dayOfMonth' && (
            <>
              <label className="block mb-2 font-medium">Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                className="border rounded px-3 py-2 mb-4 w-full"
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value)}
              />
              <label className="block mb-2 font-medium">Time</label>
              <input
                type="time"
                className="border rounded px-3 py-2 mb-4 w-full"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </>
          )}

          {frequency === 'dayOfWeek' && (
            <>
              <label className="block mb-2 font-medium">Day of Week</label>
              <select
                className="border rounded px-3 py-2 mb-4 w-full"
                value={dayOfWeek}
                onChange={e => setDayOfWeek(e.target.value)}
              >
                {daysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <label className="block mb-2 font-medium">Time</label>
              <input
                type="time"
                className="border rounded px-3 py-2 mb-4 w-full"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </>
          )}

          {frequency === 'custom' && (
            <>
              <label className="block mb-2 font-medium">Cron Expression</label>
              <input
                type="text"
                className="border rounded px-3 py-2 mb-4 w-full"
                placeholder="e.g. 0 0 * * *"
                value={customCron}
                onChange={e => setCustomCron(e.target.value)}
              />
            </>
          )}

          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
            onClick={handleSave}
            disabled={!selectedScript || (frequency === 'custom' && !customCron)}
          >
            {editingId ? 'Update Schedule' : 'Save Schedule'}
          </button>
          <button
            className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </button>
        </div>
      )}

      <hr className="my-6" />
      <h3 className="text-lg font-semibold mb-2">Scheduled Scripts</h3>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full border text-sm text-left">
          <thead>
            <tr>
              <th className="border px-2 py-1">#</th>
              <th className="border px-2 py-1">Script</th>
              <th className="border px-2 py-1">Cron</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((sch, idx) => (
              <tr key={sch._id}>
                <td className="border px-2 py-1">{idx + 1}</td>
                <td className="border px-2 py-1">{scriptOptions.find(opt => opt.value === sch.script)?.label || sch.script}</td>
                <td className="border px-2 py-1">{sch.cron}</td>
                <td className="border px-2 py-1 space-x-2 flex items-center">
                  {sch._id && (
                    <button
                      className="text-green-600 hover:text-green-800"
                      title="Run Now"
                      onClick={() => handleRunNow(sch._id)}
                    >
                      <FaPlay />
                    </button>
                  )}
                  <button
                    className="text-yellow-600 hover:text-yellow-800"
                    title="Edit"
                    onClick={() => handleEdit(sch)}
                  >
                    <FaEdit />
                  </button>
                  {sch._id && (
                    <button
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                      onClick={() => handleDelete(sch._id)}
                    >
                      <FaTrash />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ScheduleTab; 