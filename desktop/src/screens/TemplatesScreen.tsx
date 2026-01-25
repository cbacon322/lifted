import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Snackbar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Upload,
  Download,
  MoreVert,
  Delete,
  ContentCopy,
  FitnessCenter,
} from '@mui/icons-material';

// Import from shared (using relative path for now)
import {
  WorkoutTemplate,
  WorkoutImportFile,
  createTemplateFromImport,
  exportTemplatesToJson,
} from '../../../shared/models';
import {
  saveTemplate,
  deleteTemplate,
  subscribeToTemplates,
  getDevUserId,
} from '../../../shared/services/firebase';
import { validateWorkoutImport } from '../../../shared/utils';

function TemplatesScreen() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<WorkoutImportFile | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement | null; templateId: string | null }>({
    el: null,
    templateId: null,
  });

  const userId = getDevUserId();

  // Load templates on mount
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToTemplates(userId, (loadedTemplates) => {
      setTemplates(loadedTemplates);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Handle JSON input change
  const handleJsonInputChange = (value: string) => {
    setJsonInput(value);
    setImportError(null);
    setImportPreview(null);

    if (!value.trim()) return;

    const result = validateWorkoutImport(value);
    if (result.success) {
      setImportPreview(result.data as WorkoutImportFile);
    } else {
      setImportError(result.errors?.join('\n') || 'Invalid JSON');
    }
  };

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleJsonInputChange(content);
      };
      reader.readAsText(file);
    }
  }, []);

  // Handle import
  const handleImport = async () => {
    if (!importPreview) return;

    try {
      for (const workoutData of importPreview.workouts) {
        const template = createTemplateFromImport(workoutData, userId);
        console.log('Saving template:', template.name, template);
        await saveTemplate(template);
        console.log('Saved successfully:', template.name);
      }

      setSnackbar({
        open: true,
        message: `Successfully imported ${importPreview.workouts.length} template(s)`,
        severity: 'success',
      });
      setImportDialogOpen(false);
      setJsonInput('');
      setImportPreview(null);
    } catch (error) {
      console.error('Import error:', error);
      setSnackbar({
        open: true,
        message: `Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    }
  };

  // Handle export
  const handleExport = () => {
    if (templates.length === 0) return;

    const exportData = exportTemplatesToJson(templates);
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lifted-templates.json';
    a.click();
    URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: `Exported ${templates.length} template(s)`,
      severity: 'success',
    });
  };

  // Handle delete
  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate(userId, templateId);
      setSnackbar({
        open: true,
        message: 'Template deleted',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to delete template',
        severity: 'error',
      });
    }
    setMenuAnchor({ el: null, templateId: null });
  };

  // Handle duplicate
  const handleDuplicate = async (template: WorkoutTemplate) => {
    try {
      const duplicated: WorkoutTemplate = {
        ...template,
        id: `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: `${template.name} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsed: undefined,
      };
      await saveTemplate(duplicated);
      setSnackbar({
        open: true,
        message: 'Template duplicated',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to duplicate template',
        severity: 'error',
      });
    }
    setMenuAnchor({ el: null, templateId: null });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Workout Templates</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={templates.length === 0}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<Upload />}
            onClick={() => setImportDialogOpen(true)}
          >
            Import
          </Button>
        </Box>
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <FitnessCenter sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Templates Yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Import a JSON file to get started with your workout templates.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => setImportDialogOpen(true)}
            >
              Import Templates
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Templates Grid */}
      {!loading && templates.length > 0 && (
        <Grid container spacing={2}>
          {templates.map((template) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" gutterBottom>
                      {template.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => setMenuAnchor({ el: e.currentTarget, templateId: template.id })}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  {template.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {template.description}
                    </Typography>
                  )}

                  <Typography variant="body2" color="text.secondary">
                    {template.exercises.length} exercise{template.exercises.length !== 1 ? 's' : ''}
                  </Typography>

                  {template.tags && template.tags.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {template.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" disabled>
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Template Menu */}
      <Menu
        anchorEl={menuAnchor.el}
        open={Boolean(menuAnchor.el)}
        onClose={() => setMenuAnchor({ el: null, templateId: null })}
      >
        <MenuItem
          onClick={() => {
            const template = templates.find((t) => t.id === menuAnchor.templateId);
            if (template) handleDuplicate(template);
          }}
        >
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => menuAnchor.templateId && handleDelete(menuAnchor.templateId)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => {
          setImportDialogOpen(false);
          setJsonInput('');
          setImportError(null);
          setImportPreview(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Templates</DialogTitle>
        <DialogContent>
          <Box
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 3,
              mb: 2,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            <Upload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography>Drag and drop a JSON file here</Typography>
            <Typography variant="body2" color="text.secondary">
              or paste JSON below
            </Typography>
          </Box>

          <TextField
            multiline
            rows={10}
            fullWidth
            placeholder='{"workouts": [...]}'
            value={jsonInput}
            onChange={(e) => handleJsonInputChange(e.target.value)}
            error={Boolean(importError)}
            sx={{ fontFamily: 'monospace' }}
          />

          {importError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{importError}</pre>
            </Alert>
          )}

          {importPreview && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Preview:</Typography>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                {importPreview.workouts.map((w, i) => (
                  <li key={i}>
                    <strong>{w.name}</strong> - {w.exercises.length} exercises
                  </li>
                ))}
              </ul>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setImportDialogOpen(false);
              setJsonInput('');
              setImportError(null);
              setImportPreview(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!importPreview}
          >
            Import {importPreview ? `(${importPreview.workouts.length})` : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TemplatesScreen;
