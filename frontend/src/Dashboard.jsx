
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import SearchIcon from "@mui/icons-material/Search";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import api from "./services/api";

const TASKS_PER_PAGE = 5;

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  status: "pending",
};

const STATUS_COLORS = {
  pending: { color: "#a16207", bg: "#fef3c7" },
  in_progress: { color: "#1d4ed8", bg: "#dbeafe" },
  completed: { color: "#15803d", bg: "#dcfce7" },
};

const inputProps = {
  size: "small",
  fullWidth: true,
};

function getApiError(error, fallback) {
  if (!error.response) {
    return "Network error. Check your connection and try again.";
  }

  const data = error.response.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;

  if (Array.isArray(data?.title) && data.title[0]) {
    return data.title[0];
  }

  if (Array.isArray(data?.non_field_errors) && data.non_field_errors[0]) {
    return data.non_field_errors[0];
  }

  if (data && typeof data === "object") {
    const firstError = Object.values(data).find(
      (value) => Array.isArray(value) && value.length > 0
    );

    if (firstError) return String(firstError[0]);
  }

  return fallback;
}

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [newTask, setNewTask] = useState(EMPTY_FORM);
  const [titleError, setTitleError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editTitleError, setEditTitleError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState(null);

  const showToast = useCallback((message, severity = "success") => {
    setToast({ open: true, message, severity });
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("tasks/");
      const data = response.data;

      const taskList = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : null;

      if (!taskList) {
        throw new Error("Unexpected task response");
      }

      setTasks(taskList);
      return true;
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(
          err.response
            ? getApiError(err, "Unable to load tasks.")
            : "Unable to connect to the server. Check that your backend is running."
        );
      }

      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        (task.title || "").toLowerCase().includes(term) ||
        (task.description || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredTasks.length / TASKS_PER_PAGE)
  );

  const currentPage = Math.min(page, pageCount);

  const visibleTasks = filteredTasks.slice(
    (currentPage - 1) * TASKS_PER_PAGE,
    currentPage * TASKS_PER_PAGE
  );

  const completedCount = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  const pendingCount = tasks.filter(
    (task) => task.status === "pending"
  ).length;

  const progressCount = tasks.filter(
    (task) => task.status === "in_progress"
  ).length;

  const updateForm = (field, value) => {
    setNewTask((previous) => ({ ...previous, [field]: value }));

    if (field === "title" && value.trim()) {
      setTitleError("");
    }
  };

  const updateEditForm = (field, value) => {
    setEditForm((previous) => ({ ...previous, [field]: value }));

    if (field === "title" && value.trim()) {
      setEditTitleError("");
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    const title = newTask.title.trim();

    if (!title) {
      setTitleError("Please enter a task title.");
      return;
    }

    setTitleError("");
    setError("");
    setSaving(true);

    try {
      await api.post("tasks/", {
        title,
        description: newTask.description.trim(),
        status: newTask.status,
      });

      setNewTask(EMPTY_FORM);
      setSearch("");
      setStatusFilter("all");
      setPage(1);

      const refreshed = await fetchTasks();

      if (refreshed) {
        showToast("Task created successfully.");
      } else {
        showToast(
          "Task created, but the task list could not be refreshed.",
          "warning"
        );
      }
    } catch (err) {
      showToast(getApiError(err, "Unable to create task."), "error");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "pending",
    });
    setEditTitleError("");
    setEditOpen(true);
    setError("");
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingTask) return;

    const title = editForm.title.trim();

    if (!title) {
      setEditTitleError("Please enter a task title.");
      return;
    }

    setEditTitleError("");
    setError("");
    setSaving(true);

    try {
      await api.patch(`tasks/${editingTask.id}/`, {
        title,
        description: editForm.description.trim(),
        status: editForm.status,
      });

      setEditOpen(false);
      setEditingTask(null);

      const refreshed = await fetchTasks();

      if (refreshed) {
        showToast("Task updated successfully.");
      } else {
        showToast(
          "Task updated, but the task list could not be refreshed.",
          "warning"
        );
      }
    } catch (err) {
      showToast(getApiError(err, "Unable to update task."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTask) return;

    setError("");
    setSaving(true);

    try {
      await api.delete(`tasks/${deletingTask.id}/`);

      setDeleteOpen(false);
      setDeletingTask(null);

      const refreshed = await fetchTasks();

      if (refreshed) {
        showToast("Task deleted successfully.");
      } else {
        showToast(
          "Task deleted, but the task list could not be refreshed.",
          "warning"
        );
      }
    } catch (err) {
      showToast(getApiError(err, "Unable to delete task."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    window.location.href = "/";
  };

  const statCards = [
    {
      label: "Total tasks",
      value: tasks.length,
      icon: <AssignmentOutlinedIcon />,
      color: "#4f46e5",
      bg: "#eef2ff",
    },
    {
      label: "Pending",
      value: pendingCount,
      icon: <PendingActionsOutlinedIcon />,
      color: "#d97706",
      bg: "#fffbeb",
    },
    {
      label: "In progress",
      value: progressCount,
      icon: <TrendingUpIcon />,
      color: "#0284c7",
      bg: "#f0f9ff",
    },
    {
      label: "Completed",
      value: completedCount,
      icon: <CheckCircleOutlinedIcon />,
      color: "#16a34a",
      bg: "#f0fdf4",
    },
  ];

  const statusChip = (status) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
    const label =
      STATUSES.find((item) => item.value === status)?.label || status;

    return (
      <Chip
        size="small"
        label={label}
        sx={{
          color: colors.color,
          backgroundColor: colors.bg,
          fontWeight: 600,
          fontSize: 11,
          height: 24,
          borderRadius: 1.5,
        }}
      />
    );
  };

  const hasActiveFilters =
    Boolean(search.trim()) || statusFilter !== "all";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc" }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "#fff",
          color: "#172554",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <Toolbar sx={{ minHeight: "60px !important" }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              bgcolor: "#eef2ff",
              color: "#4338ca",
              display: "grid",
              placeItems: "center",
              mr: 1.5,
              flexShrink: 0,
            }}
          >
            <AssignmentOutlinedIcon fontSize="small" />
          </Box>

          <Typography
            fontWeight={750}
            fontSize={19}
            sx={{ flexGrow: 1 }}
          >
            TaskFlow
          </Typography>

          <Button
            size="small"
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ color: "#64748b", textTransform: "none" }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 2.5, md: 3.5 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2.5 }}
        >
          <Box>
            <Typography
              variant="h5"
              fontWeight={750}
              color="#0f172a"
              sx={{
                letterSpacing: "-0.5px",
                fontSize: { xs: 23, sm: 28 },
              }}
            >
              My Dashboard
            </Typography>

            <Typography color="#64748b" variant="body2" sx={{ mt: 0.5 }}>
              Manage your tasks and track your progress.
            </Typography>
          </Box>

          <Chip
            label={`${completedCount} of ${tasks.length} completed`}
            size="small"
            sx={{
              bgcolor: "#ecfdf5",
              color: "#047857",
              fontWeight: 600,
            }}
          />
        </Stack>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: 2 }}
            action={
              !loading ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={fetchTasks}
                >
                  Retry
                </Button>
              ) : undefined
            }
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

        {/* Statistics */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(4, minmax(0, 1fr))",
            },
            gap: { xs: 1, sm: 1.5 },
            mb: 2.5,
          }}
        >
          {statCards.map((stat) => (
            <Card
              key={stat.label}
              elevation={0}
              sx={{
                minWidth: 0,
                border: "1px solid #e8edf4",
                borderRadius: 2.5,
                boxShadow: "0 1px 2px rgba(15,23,42,0.02)",
              }}
            >
              <CardContent
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  "&:last-child": { pb: { xs: 1.5, sm: 2 } },
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={{ xs: 1, sm: 1.5 }}
                >
                  <Box
                    sx={{
                      width: { xs: 32, sm: 38 },
                      height: { xs: 32, sm: 38 },
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 2,
                      color: stat.color,
                      bgcolor: stat.bg,
                      "& .MuiSvgIcon-root": {
                        fontSize: { xs: 19, sm: 22 },
                      },
                    }}
                  >
                    {stat.icon}
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      color="#64748b"
                      sx={{
                        fontSize: { xs: 11, sm: 12 },
                        overflowWrap: "anywhere",
                      }}
                    >
                      {stat.label}
                    </Typography>

                    <Typography
                      variant="h5"
                      fontWeight={750}
                      color="#0f172a"
                      sx={{ mt: 0.25, fontSize: { xs: 22, sm: 28 } }}
                    >
                      {stat.value}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Create task */}
        <Paper
          component="form"
          onSubmit={handleCreate}
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            mb: 2.5,
            border: "1px solid #e5eaf1",
            borderRadius: 2.5,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} mb={1.75}>
            <AddIcon sx={{ color: "#4f46e5" }} />
            <Typography fontWeight={700} color="#0f172a">
              Add a task
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "2fr 2fr 1.2fr auto",
              },
              gap: 1.25,
              alignItems: "start",
            }}
          >
            <TextField
              {...inputProps}
              label="Task title"
              value={newTask.title}
              onChange={(event) => updateForm("title", event.target.value)}
              inputProps={{ maxLength: 200 }}
              error={Boolean(titleError)}
              helperText={titleError || " "}
              required
            />

            <TextField
              {...inputProps}
              label="Description (optional)"
              value={newTask.description}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
            />

            <TextField
              {...inputProps}
              select
              label="Status"
              value={newTask.status}
              onChange={(event) => updateForm("status", event.target.value)}
            >
              {STATUSES.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </TextField>

            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={
                saving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AddIcon />
                )
              }
              sx={{
                height: 40,
                px: 2,
                width: { xs: "100%", md: "auto" },
                textTransform: "none",
                fontWeight: 650,
                boxShadow: "none",
                whiteSpace: "nowrap",
              }}
            >
              {saving ? "Saving..." : "Add task"}
            </Button>
          </Box>
        </Paper>

        {/* Task list */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            border: "1px solid #e5eaf1",
            borderRadius: 2.5,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography fontWeight={700} color="#0f172a">
                My tasks
              </Typography>

              <Typography variant="caption" color="#64748b">
                {filteredTasks.length}{" "}
                {filteredTasks.length === 1 ? "task" : "tasks"} found
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ width: { xs: "100%", sm: "auto" }, minWidth: 0 }}
            >
              <TextField
                placeholder="Search tasks"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  minWidth: { xs: 0, sm: 180 },
                  "& .MuiOutlinedInput-root": { bgcolor: "#fff" },
                }}
              />

              <TextField
                select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                size="small"
                fullWidth
                aria-label="Filter by status"
                sx={{
                  minWidth: { xs: 0, sm: 135 },
                  "& .MuiOutlinedInput-root": { bgcolor: "#fff" },
                }}
              >
                <MenuItem value="all">All statuses</MenuItem>
                {STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>

          <Divider />

          {loading ? (
            <Box
              sx={{
                py: 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <CircularProgress size={30} />
              <Typography variant="body2" color="#64748b">
                Loading your tasks...
              </Typography>
            </Box>
          ) : visibleTasks.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 5, px: 1 }}>
              <Box
                sx={{
                  mx: "auto",
                  mb: 1.5,
                  width: 46,
                  height: 46,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 3,
                  bgcolor: "#f1f5f9",
                  color: "#94a3b8",
                }}
              >
                <AssignmentOutlinedIcon />
              </Box>

              <Typography fontWeight={650} color="#334155">
                {hasActiveFilters ? "No matching tasks" : "No tasks yet"}
              </Typography>

              <Typography variant="body2" color="#64748b" sx={{ mt: 0.5 }}>
                {hasActiveFilters
                  ? "Try changing your search or status filter."
                  : "Add your first task using the form above."}
              </Typography>

              {hasActiveFilters && (
                <Button
                  size="small"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPage(1);
                  }}
                  sx={{ mt: 1, textTransform: "none" }}
                >
                  Clear filters
                </Button>
              )}
            </Box>
          ) : (
            <Stack divider={<Divider />} spacing={0}>
              {visibleTasks.map((task) => (
                <Box
                  key={task.id}
                  sx={{
                    py: 1.75,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.25,
                    minWidth: 0,
                    "&:hover .task-actions": { opacity: 1 },
                  }}
                >
                  <Box
                    sx={{
                      mt: 0.75,
                      width: 8,
                      height: 8,
                      flexShrink: 0,
                      borderRadius: "50%",
                      bgcolor:
                        task.status === "completed"
                          ? "#22c55e"
                          : task.status === "in_progress"
                            ? "#3b82f6"
                            : "#f59e0b",
                    }}
                  />

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      fontWeight={650}
                      fontSize={14}
                      color="#1e293b"
                      sx={{
                        overflowWrap: "anywhere",
                        textDecoration:
                          task.status === "completed" ? "line-through" : "none",
                        textDecorationColor: "#94a3b8",
                      }}
                    >
                      {task.title}
                    </Typography>

                    {task.description && (
                      <Typography
                        variant="body2"
                        color="#64748b"
                        sx={{
                          mt: 0.5,
                          fontSize: 13,
                          overflowWrap: "anywhere",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {task.description}
                      </Typography>
                    )}

                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.75 }}
                    >
                      {statusChip(task.status)}

                      <Typography variant="caption" color="#94a3b8">
                        #{task.id}
                      </Typography>
                    </Stack>
                  </Box>

                  <Stack
                    className="task-actions"
                    direction="row"
                    spacing={0}
                    sx={{
                      flexShrink: 0,
                      opacity: { xs: 1, md: 0.75 },
                      transition: "opacity 0.15s",
                    }}
                  >
                    <Tooltip title="Edit task">
                      <IconButton
                        size="small"
                        aria-label={`Edit ${task.title}`}
                        onClick={() => openEdit(task)}
                        sx={{
                          color: "#4f46e5",
                          "&:hover": { bgcolor: "#eef2ff" },
                        }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete task">
                      <IconButton
                        size="small"
                        aria-label={`Delete ${task.title}`}
                        onClick={() => {
                          setDeletingTask(task);
                          setDeleteOpen(true);
                          setError("");
                        }}
                        sx={{
                          color: "#dc2626",
                          "&:hover": { bgcolor: "#fef2f2" },
                        }}
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          {!loading && filteredTasks.length > TASKS_PER_PAGE && (
            <>
              <Divider />

              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems="center"
                justifyContent="space-between"
                spacing={1.5}
                sx={{ pt: 2 }}
              >
                <Typography variant="caption" color="#64748b">
                  Showing {(currentPage - 1) * TASKS_PER_PAGE + 1}–
                  {Math.min(
                    currentPage * TASKS_PER_PAGE,
                    filteredTasks.length
                  )}{" "}
                  of {filteredTasks.length}
                </Typography>

                <Pagination
                  count={pageCount}
                  page={currentPage}
                  onChange={(_, value) => setPage(value)}
                  size="small"
                  color="primary"
                  shape="rounded"
                  siblingCount={0}
                  boundaryCount={1}
                />
              </Stack>
            </>
          )}
        </Paper>

        <Typography
          variant="caption"
          color="#94a3b8"
          sx={{ display: "block", textAlign: "center", mt: 2.5 }}
        >
          TaskFlow · Keep your work organized
        </Typography>
      </Container>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleUpdate}>
          <DialogTitle sx={{ fontWeight: 750, pb: 1 }}>
            Edit task
          </DialogTitle>

          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Task title"
                value={editForm.title}
                onChange={(event) =>
                  updateEditForm("title", event.target.value)
                }
                required
                fullWidth
                inputProps={{ maxLength: 200 }}
                error={Boolean(editTitleError)}
                helperText={editTitleError || " "}
              />

              <TextField
                label="Description"
                value={editForm.description}
                onChange={(event) =>
                  updateEditForm("description", event.target.value)
                }
                fullWidth
                multiline
                minRows={3}
              />

              <TextField
                select
                label="Status"
                value={editForm.status}
                onChange={(event) =>
                  updateEditForm("status", event.target.value)
                }
                fullWidth
              >
                {STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button
              onClick={() => setEditOpen(false)}
              disabled={saving}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={
                saving ? <CircularProgress size={16} color="inherit" /> : null
              }
              sx={{ textTransform: "none", boxShadow: "none" }}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteOpen}
        onClose={() => !saving && setDeleteOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 750 }}>Delete task?</DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="#64748b">
            Are you sure you want to delete{" "}
            <strong>{deletingTask?.title}</strong>? This action cannot be
            undone.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            disabled={saving}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={saving}
            startIcon={
              saving ? <CircularProgress size={16} color="inherit" /> : null
            }
            sx={{ textTransform: "none", boxShadow: "none" }}
          >
            {saving ? "Deleting..." : "Delete task"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Temporary success and error notifications */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={(_, reason) => {
          if (reason !== "clickaway") {
            setToast((previous) => ({ ...previous, open: false }));
          }
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() =>
            setToast((previous) => ({ ...previous, open: false }))
          }
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
