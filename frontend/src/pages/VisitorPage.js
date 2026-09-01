import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { VisitorContext } from '../context/VisitorContext';
import { PageMetaContext } from '../context/PageMetaContext';
import { useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import EmptyState from '../components/EmptyState';
import AppModal from '../components/AppModal';
import ColumnVisibility from '../components/ColumnVisibility';
import useColumnVisibility from '../hooks/useColumnVisibility';
import './common.css';
import './VisitorPage.css';
import './VisitorPageIdPreview.css';
import { QRCodeCanvas } from 'qrcode.react';
import ID_Background from '../assets/ID_Background.png';
import { toPng } from 'html-to-image';

const VisitorPage = () => {
  const { pdlId } = useParams();
  const location = useLocation();

  // Function to get today's date in yyyy-mm-dd format for max attribute
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [pdl, setPdl] = useState(location.state?.pdl || null);
  // eslint-disable-next-line no-unused-vars
  const { visitorData, loading, error } = useContext(VisitorContext);
  const { setVisitorName } = useContext(PageMetaContext);
  const [visitors, setVisitors] = useState([]);
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [visitorForm, setVisitorForm] = useState({
    name: '',
    relationship: '',
    age: '',
    address: '',
    valid_id: '',
    date_of_application: '',
    contact_number: '',
    has_contact_number: true,
    verified_conjugal: false
  });
  const [editingVisitorId, setEditingVisitorId] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [pdlFetchError, setPdlFetchError] = useState(null);

  // Column visibility (persisted per table); Actions/Select stay locked
  const visitorColumns = [
    { key: 'name', label: 'Name' },
    { key: 'relationship', label: 'Relationship' },
    { key: 'age', label: 'Age' },
    { key: 'address', label: 'Address' },
    { key: 'valid_id', label: 'Valid ID' },
    { key: 'date_of_application', label: 'Date of Application' },
    { key: 'contact_number', label: 'Contact Number' },
  ];
  const colVis = useColumnVisibility({
    storageKey: 'visitorpage.visibleColumns',
    allColumns: visitorColumns,
  });

  // New states for Create ID feature
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedVisitorIds, setSelectedVisitorIds] = useState([]);
  const [showIdPreview, setShowIdPreview] = useState(false);
  const idPreviewRef = useRef(null);

  // New states for photo capture feature
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraVisitorId, setCameraVisitorId] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState({}); // visitorId -> photo data URL
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const fetchVisitors = useCallback(async () => {
    try {
      console.log(`Fetching visitors for PDL ID: ${pdlId}`);
      const res = await api.get(`/api/pdls/${pdlId}/visitors`);
      console.log('Visitors fetched:', res.data);
      const visitorsWithFormattedDate = res.data.map(visitor => ({
        ...visitor,
        date_of_application: visitor.date_of_application || '',
      }));
      setVisitors(visitorsWithFormattedDate);
      setFetchError(null);
    } catch (err) {
      console.error('Failed to fetch visitors:', err);
      setFetchError('Failed to fetch visitors. Please try again later.');
      setVisitors([]);
    }
  }, [pdlId]);

  useEffect(() => {
    if (!pdl) {
      console.log(`Fetching PDL data for ID: ${pdlId}`);
      api.get(`/pdls/${pdlId}`).then(res => {
        if (res.data) {
          console.log('PDL data fetched:', res.data);
          setPdl(res.data);
          setPdlFetchError(null);
        } else {
          setPdl({ first_name: 'Unknown', last_name: 'PDL' });
          setPdlFetchError('PDL data not found.');
        }
      }).catch(err => {
        console.error('Failed to fetch PDL:', err);
        setPdl({ first_name: 'Unknown', last_name: 'PDL' });
        setPdlFetchError('Failed to fetch PDL data. Please try again later.');
      });
    }
    fetchVisitors();
  }, [pdlId, pdl, fetchVisitors]);

  useEffect(() => {
    setVisitorName(pdl ? `${pdl.first_name} ${pdl.last_name}` : null);
    return () => setVisitorName(null);
  }, [pdl, setVisitorName]);

  const resetForm = () => {
    setVisitorForm({
      name: '',
      relationship: '',
      age: '',
      address: '',
      valid_id: '',
      date_of_application: '',
      contact_number: '',
      has_contact_number: true,
      verified_conjugal: false
    });
  };

  // Helpers for input validation/formatting
  const toTitleCase = (value) => {
    if (!value) return '';
    return value
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const normalizeRelationship = (value) => {
    if (!value) return '';
    const lettersAndSpaces = value.replace(/[^A-Za-z\s]/g, ' ');
    return toTitleCase(lettersAndSpaces);
  };

  const normalizeAddress = (value) => toTitleCase(value || '');

  const normalizeContactNumber = (value) => {
    if (!value) return '';
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits;
  };

  const clampAge = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const num = Math.max(0, Math.min(150, parseInt(value, 10) || 0));
    return String(num);
  };

  const handleAddVisitor = async (e) => {
    e.preventDefault();
    const hasNumber = !!visitorForm.has_contact_number;
    const contact = hasNumber ? normalizeContactNumber(visitorForm.contact_number) : 'N/A';
    if (hasNumber && !/^09\d{9}$/.test(contact)) {
      alert('Contact number must be 11 digits and start with 09.');
      return;
    }
    const payload = {
      ...visitorForm,
      relationship: normalizeRelationship(visitorForm.relationship),
      address: normalizeAddress(visitorForm.address),
      contact_number: contact,
      age: clampAge(visitorForm.age)
    };
    try {
      const response = await api.post(`/api/pdls/${pdlId}/visitors`, payload);
      alert(response.data.message || 'Visitor added successfully');
      setShowAddModal(false);
      resetForm();
      await fetchVisitors();
    } catch (err) {
      console.error('Error adding visitor:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        alert(err.response.data.error || 'Failed to add visitor');
      } else if (err.request) {
        console.error('Request:', err.request);
        alert('No response received from server');
      } else {
        alert('Error: ' + err.message);
      }
    }
  };

  const handleEditVisitor = async (e) => {
    e.preventDefault();
    const hasNumber = !!visitorForm.has_contact_number;
    const contact = hasNumber ? normalizeContactNumber(visitorForm.contact_number) : 'N/A';
    if (hasNumber && !/^09\d{9}$/.test(contact)) {
      alert('Contact number must be 11 digits and start with 09.');
      return;
    }
    const payload = {
      ...visitorForm,
      relationship: normalizeRelationship(visitorForm.relationship),
      address: normalizeAddress(visitorForm.address),
      contact_number: contact,
      age: clampAge(visitorForm.age),
      has_contact_number: hasNumber, // Explicitly include has_contact_number
      verified_conjugal: !!visitorForm.verified_conjugal // Explicitly include verified_conjugal as boolean
    };
    try {
      await api.put(`/api/visitors/${editingVisitorId}`, payload);
      alert('Visitor updated successfully');
      setShowEditModal(false);
      resetForm();
      setEditingVisitorId(null);
      await fetchVisitors();
    } catch (err) {
      console.error('Error editing visitor:', err);
      alert('Failed to edit visitor');
    }
  };

  const handleDeleteVisitor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this visitor?')) return;
    try {
      await api.delete(`/api/visitors/${id}`);
      alert('Visitor deleted successfully');
      await fetchVisitors();
    } catch (err) {
      console.error('Error deleting visitor:', err);
      alert('Failed to delete visitor');
    }
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForTable = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const openEditModal = (visitor) => {
    // Check if contact_number is 'N/A' or empty to determine has_contact_number
    const contactNum = visitor.contact_number || '';
    const hasContact = contactNum.trim() !== '' && contactNum.trim().toUpperCase() !== 'N/A';
    
    setVisitorForm({
      name: visitor.name || '',
      relationship: visitor.relationship || '',
      age: visitor.age || '',
      address: visitor.address || '',
      valid_id: visitor.valid_id || '',
      date_of_application: formatDateForInput(visitor.date_of_application),
      contact_number: hasContact ? contactNum : '', // Only set contact if it's not N/A
      has_contact_number: hasContact, // Properly check if contact exists and is not N/A
      verified_conjugal: !!visitor.verified_conjugal // Ensure boolean conversion
    });
    setEditingVisitorId(visitor.id);
    setShowEditModal(true);
    setShowAddModal(false); // Ensure add modal is closed
  };

  const openAddModal = () => {
    resetForm();
    setEditingVisitorId(null);
    setShowAddModal(true);
    setShowEditModal(false); // Ensure edit modal is closed
  };

  // Handler for toggling selection mode
  const handleCreateIdClick = () => {
    setIsSelecting(true);
    setSelectedVisitorIds([]);
  };

  // Handler for checkbox change
  const handleCheckboxChange = (visitorId) => {
    setSelectedVisitorIds((prevSelected) => {
      if (prevSelected.includes(visitorId)) {
        return prevSelected.filter(id => id !== visitorId);
      } else {
        return [...prevSelected, visitorId];
      }
    });
  };

  // Handler for cancel button
  const handleCancelSelection = () => {
    setIsSelecting(false);
    setSelectedVisitorIds([]);
  };

  // Handler for confirm button
  const handleConfirmSelection = () => {
    if (selectedVisitorIds.length === 0) {
      alert('Please select at least one visitor to create ID.');
      return;
    }
    setShowIdPreview(true);
    setIsSelecting(false);
  };

  // Close ID preview
  const handleCloseIdPreview = () => {
    setShowIdPreview(false);
    setSelectedVisitorIds([]);
  };

  // Open camera modal for a specific visitor
  const openCameraForVisitor = (visitorId) => {
    setCameraVisitorId(visitorId);
    setShowCameraModal(true);
  };

  // Close camera modal and stop camera stream
  const closeCameraModal = () => {
    setShowCameraModal(false);
    setCameraVisitorId(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Start camera stream when modal opens
  useEffect(() => {
    if (showCameraModal) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
        } catch (err) {
          alert('Could not access the camera. Please check permissions.');
          closeCameraModal();
        }
      };
      startCamera();
    } else {
      // Stop camera when modal closes
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [showCameraModal]);

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setCapturedPhotos(prev => ({
      ...prev,
      [cameraVisitorId]: dataUrl
    }));
    closeCameraModal();
  };

  // Get selected visitors data
  const selectedVisitors = visitors.filter(visitor => selectedVisitorIds.includes(visitor.id));

  // While any part of the ID workflow is active, keep every row fully
  // expanded and ignore collapse toggles (mobile card view hides details).
  const idWorkflowActive = isSelecting || showIdPreview || selectedVisitorIds.length > 0;

  // Name of the visitor currently targeted by the camera modal (for header display)
  const cameraVisitorName = cameraVisitorId != null
    ? (visitors.find(v => v.id === cameraVisitorId)?.name || '')
    : '';

  const toggleCollapse = (id) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Print: clone cards into a dedicated print root so the rest of the app is
  // display:none (no blank leading pages) and each card paginates to its own sheet.
  const handlePrintSelected = async () => {
    try {
      const container = document.getElementById('id-preview-container');
      if (!container) {
        alert('ID preview container not found.');
        return;
      }

      const printRoot = document.createElement('div');
      printRoot.id = 'print-root';
      Array.from(container.children).forEach((card) => {
        const clone = card.cloneNode(true);
        clone.querySelectorAll('.id-photo-btn').forEach((btn) => btn.remove());

        // cloneNode does NOT copy <canvas> pixels (QR codes) - swap each
        // cloned canvas for an <img> carrying the original's bitmap.
        const srcCanvases = card.querySelectorAll('canvas');
        const dstCanvases = clone.querySelectorAll('canvas');
        srcCanvases.forEach((cv, i) => {
          const dst = dstCanvases[i];
          if (!dst || typeof cv.toDataURL !== 'function') return;
          const img = document.createElement('img');
          img.src = cv.toDataURL('image/png');
          img.style.width = `${cv.clientWidth}px`;
          img.style.height = `${cv.clientHeight}px`;
          img.style.display = 'block';
          if (dst.className) img.className = dst.className;
          dst.replaceWith(img);
        });

        printRoot.appendChild(clone);
      });

      document.body.appendChild(printRoot);
      document.body.classList.add('print-only-id-preview');

      // Wait until every image (backgrounds, logos, QR data-URLs) is loaded
      // AND decoded. Newly appended imgs often reach window.print() before
      // their bitmaps are ready, which prints empty boxes - waiting makes
      // the output deterministic instead of working "on the second try".
      await Promise.all(Array.from(printRoot.querySelectorAll('img')).map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
        }
        return new Promise((resolve) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            img.removeEventListener('load', done);
            img.removeEventListener('error', done);
            if (img.decode) img.decode().catch(() => {});
            resolve();
          };
          img.addEventListener('load', done);
          img.addEventListener('error', done);
          // Safety valve: never block the print dialog for more than 4s.
          setTimeout(done, 4000);
        });
      }));

      // Let layout/paint settle twice before snapshotting.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const cleanup = () => {
        document.body.classList.remove('print-only-id-preview');
        if (printRoot.parentNode) printRoot.parentNode.removeChild(printRoot);
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);

      window.print();
    } catch (error) {
      console.error('Print error:', error);
      alert('An error occurred while trying to print. Please try again.');
    }
  };

  // Save: single ID downloads a PNG directly; multiple IDs are bundled
  // into one zip archive instead of triggering many separate downloads.
  const handleSaveIds = async () => {
    const container = document.getElementById('id-preview-container');
    if (!container) {
      alert('ID preview container not found.');
      return;
    }
    const cards = Array.from(container.querySelectorAll('.id-card'));
    if (!cards.length) {
      alert('No ID cards to save.');
      return;
    }

    // Render every card first; abort early (nothing downloaded) on failure.
    const exports = [];
    for (let i = 0; i < cards.length; i++) {
      const visitor = selectedVisitors[i];
      const name = (visitor?.name || `visitor_${visitor?.id || i + 1}`).replace(/\s+/g, '_');
      try {
        // eslint-disable-next-line no-await-in-loop
        const dataUrl = await toPng(cards[i], {
          pixelRatio: 3,
          filter: (node) => !(node.classList && node.classList.contains('id-photo-btn')),
        });
        exports.push({ name, dataUrl });
      } catch (error) {
        console.error('Error rendering image:', error);
        alert(`Failed to render the ID image for ${name}. Nothing was downloaded.`);
        return;
      }
    }

    try {
      if (exports.length === 1) {
        const link = document.createElement('a');
        link.download = `${exports[0].name}_ID.png`;
        link.href = exports[0].dataUrl;
        link.click();
        return;
      }

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const usedNames = new Set();
      exports.forEach(({ name, dataUrl }) => {
        let fileName = `${name}_ID.png`;
        let n = 2;
        while (usedNames.has(fileName)) {
          fileName = `${name}_${n}_ID.png`;
          n++;
        }
        usedNames.add(fileName);
        zip.file(fileName, dataUrl.split(',')[1], { base64: true });
      });

      const stamp = new Date().toISOString().slice(0, 10);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `Visitor_IDs_${stamp}.zip`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error) {
      console.error('Error saving images:', error);
      alert('Failed to save the visitor ID images.');
    }
  };

  return (
    <div className="common-container">
      <main>
        {pdlFetchError && <p style={{ color: 'red' }}>{pdlFetchError}</p>}
        {fetchError && <p style={{ color: 'red' }}>{fetchError}</p>}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
          <button className="common-button add" onClick={openAddModal}>
            <svg className="button-icon" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add Visitor
          </button>
          <ColumnVisibility
            columns={visitorColumns}
            isVisible={colVis.isVisible}
            onToggle={colVis.toggleColumn}
            onShowAll={() => colVis.setAll(true)}
            onHideAll={() => colVis.setAll(false)}
            align="left"
          />
        </div>

        <div className="visitor-table-wrapper">
          <table className="common-table card-table card-first-is-name">
            <thead>
              <tr>
                {isSelecting && <th>Select</th>}
                {colVis.isVisible('name') && <th>Name</th>}
                {colVis.isVisible('relationship') && <th>Relationship</th>}
                {colVis.isVisible('age') && <th>Age</th>}
                {colVis.isVisible('address') && <th>Address</th>}
                {colVis.isVisible('valid_id') && <th>Valid ID</th>}
                {colVis.isVisible('date_of_application') && <th>Date of Application</th>}
                {colVis.isVisible('contact_number') && <th>Contact Number</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visitors.length === 0 ? (
                <tr>
                  <td colSpan={visitorColumns.filter(c => colVis.isVisible(c.key)).length + 1 + (isSelecting ? 1 : 0)} style={{ padding: 0 }}>
                    <EmptyState
                      title="No visitors yet"
                      description="No visitors registered for this PDL. Add a visitor to get started."
                    />
                  </td>
                </tr>
              ) : (
                visitors.map(visitor => (
                  <tr
                    key={visitor.id}
                    className={(idWorkflowActive || collapsedIds.has(visitor.id)) ? 'card-expanded' : 'card-collapsed'}
                    onClick={() => { if (!idWorkflowActive) toggleCollapse(visitor.id); }}
                    style={{ cursor: idWorkflowActive ? 'default' : 'pointer' }}
                  >
                    {isSelecting && (
                      <td className="select-cell">
                        <input
                          type="checkbox"
                          checked={selectedVisitorIds.includes(visitor.id)}
                          onChange={() => handleCheckboxChange(visitor.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    {colVis.isVisible('name') && <td data-label="Name">{visitor.name}</td>}
                    {colVis.isVisible('relationship') && <td data-label="Relationship">{visitor.relationship}</td>}
                    {colVis.isVisible('age') && <td data-label="Age">{visitor.age}</td>}
                    {colVis.isVisible('address') && <td data-label="Address">{visitor.address}</td>}
                    {colVis.isVisible('valid_id') && <td data-label="Valid ID">{visitor.valid_id}</td>}
                    {colVis.isVisible('date_of_application') && <td data-label="Date of Application">{formatDateForTable(visitor.date_of_application)}</td>}
                    {colVis.isVisible('contact_number') && <td data-label="Contact Number">{visitor.contact_number}</td>}
                    <td data-label="Actions">
                      <div className="action-buttons-row table-row-hover-actions">
                        <button
                          type="button"
                          className="common-button edit icon-button"
                          title="Edit visitor"
                          aria-label="Edit visitor"
                          onClick={() => openEditModal(visitor)}
                        >
                          <svg className="button-icon" viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="common-button delete icon-button"
                          title="Delete visitor"
                          aria-label="Delete visitor"
                          onClick={() => handleDeleteVisitor(visitor.id)}
                        >
                          <svg className="button-icon" viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="card-summary">{visitor.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isSelecting && !showIdPreview && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            <button className="common-button" onClick={handleCreateIdClick}>
              <svg className="button-icon" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
              Create ID
            </button>
          </div>
        )}

        {isSelecting && (
          <div className="id-preview-buttons">
            <button className="common-button save" onClick={handleConfirmSelection}>
              <svg className="button-icon" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Confirm
            </button>
            <button className="common-button delete" onClick={handleCancelSelection}>
              <svg className="button-icon" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
              Cancel
            </button>
          </div>
        )}

        {showAddModal && (
          <AppModal
            open={showAddModal}
            onClose={() => { setShowAddModal(false); resetForm(); setEditingVisitorId(null); }}
            title="Add Visitor"
            subtitle="Register a new visitor for this PDL"
            tone="blue"
            titleColor="#1d4ed8"
            titleIcon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            }
            maxWidth="md"
            maxContentWidth={760}
            actions={
              <>
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); setEditingVisitorId(null); }} className="common-button cancel">
                  Cancel
                </button>
                <button type="submit" form="add-visitor-form" className="common-button">
                  Submit
                </button>
              </>
            }
          >
            <div className="add-pdl-modal">
              <form id="add-visitor-form" onSubmit={handleAddVisitor}>
                <div className="add-pdl-sections">
                  <div className="add-pdl-section">
                    <h4>Personal Information</h4>
                    <div className="add-pdl-fields">
                      <div className="add-pdl-field">
                        <label>Name *</label>
                        <input
                          type="text"
                          placeholder="Enter visitor name"
                          value={visitorForm.name}
                          onChange={(e) => setVisitorForm({ ...visitorForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="add-pdl-field">
                        <label>Relationship *</label>
                        <input
                          type="text"
                          placeholder="Enter relationship to PDL"
                          value={visitorForm.relationship}
                          onChange={(e) => setVisitorForm({ ...visitorForm, relationship: normalizeRelationship(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="add-pdl-field">
                        <label>Age *</label>
                        <input
                          type="number"
                          min="0"
                          max="150"
                          placeholder="Enter age"
                          value={visitorForm.age}
                          onChange={(e) => setVisitorForm({ ...visitorForm, age: clampAge(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="add-pdl-field">
                        <label>Address *</label>
                        <input
                          type="text"
                          placeholder="Enter address"
                          value={visitorForm.address}
                          onChange={(e) => setVisitorForm({ ...visitorForm, address: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="add-pdl-section">
                    <h4>Documentation & Contact</h4>
                    <div className="add-pdl-fields">
                      <div className="add-pdl-field">
                        <label>Valid ID *</label>
                        <input
                          type="text"
                          placeholder="Enter valid ID number"
                          value={visitorForm.valid_id}
                          onChange={(e) => setVisitorForm({ ...visitorForm, valid_id: e.target.value })}
                          required
                        />
                      </div>
                      <div className="add-pdl-field">
                        <label>Date of Application *</label>
                        <input
                          type="date"
                          value={visitorForm.date_of_application}
                          max={getTodayDate()}
                          onChange={(e) => setVisitorForm({ ...visitorForm, date_of_application: e.target.value })}
                          required
                        />
                      </div>
                      <div className="add-pdl-field">
                        <label>Contact Number</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <label className="add-pdl-checkbox-row">
                            <input
                              type="checkbox"
                              checked={!!visitorForm.has_contact_number}
                              onChange={(e) => setVisitorForm({ ...visitorForm, has_contact_number: e.target.checked })}
                            />
                            Visitor has contact number
                          </label>
                        </div>
                        <input
                          type="text"
                          placeholder="Enter contact number (09xxxxxxxxx)"
                          value={visitorForm.contact_number}
                          onChange={(e) => setVisitorForm({ ...visitorForm, contact_number: normalizeContactNumber(e.target.value) })}
                          inputMode="numeric"
                          maxLength={11}
                          title="Contact number must be 11 digits and start with 09"
                          disabled={!visitorForm.has_contact_number}
                          required={!!visitorForm.has_contact_number}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="add-pdl-dates-section">
                  <h4>Visit Type</h4>
                  <div className="add-pdl-field">
                    <label className="add-pdl-checkbox-row" style={{ marginBottom: 0 }}>
                      <input
                        type="checkbox"
                        checked={visitorForm.verified_conjugal}
                        onChange={(e) => setVisitorForm({ ...visitorForm, verified_conjugal: e.target.checked })}
                      />
                      Verified for conjugal visit
                    </label>
                  </div>
                </div>
              </form>
            </div>
          </AppModal>
        )}

        {showEditModal && (
          <AppModal
            open={showEditModal}
            onClose={() => { setShowEditModal(false); resetForm(); setEditingVisitorId(null); }}
            title="Edit Visitor"
            subtitle="Update the details of this visitor"
            tone="slate"
            titleColor="#111827"
            titleIcon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
              </svg>
            }
            maxWidth="md"
            maxContentWidth={760}
            actions={
              <>
                <button type="button" onClick={() => { setShowEditModal(false); resetForm(); setEditingVisitorId(null); }} className="common-button cancel">
                  Cancel
                </button>
                <button type="submit" form="edit-visitor-form" className="common-button">
                  Submit
                </button>
              </>
            }
          >
            <div>
              <form id="edit-visitor-form" onSubmit={handleEditVisitor}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '20px',
                  marginBottom: '24px'
                }}>
                  {/* Personal Information Section */}
                  <div style={{ 
                    background: '#f8fafc', 
                    padding: '20px', 
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h4 style={{ 
                      margin: '0 0 20px 0', 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#374151',
                      borderBottom: '2px solid #4b5563',
                      paddingBottom: '8px'
                    }}>
                      Personal Information
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Name *</label>
                        <input
                          type="text"
                          placeholder="Enter visitor name"
                          value={visitorForm.name}
                          onChange={(e) => setVisitorForm({ ...visitorForm, name: e.target.value })}
                          required
                          style={{
                            width: '90%',
                            padding: '10px 12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px',
                            transition: 'border-color 0.2s ease'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Relationship *</label>
                        <input
                          type="text"
                          placeholder="Enter relationship to PDL"
                          value={visitorForm.relationship}
                          onChange={(e) => setVisitorForm({ ...visitorForm, relationship: normalizeRelationship(e.target.value) })}
                          required
                          style={{
                            width: '90%',
                            padding: '10px 12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px',
                            transition: 'border-color 0.2s ease'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Age *</label>
                        <input
                          type="number"
                          min="0"
                          max="150"
                          placeholder="Enter age"
                          value={visitorForm.age}
                          onChange={(e) => setVisitorForm({ ...visitorForm, age: clampAge(e.target.value) })}
                          required
                          style={{
                            width: '90%',
                            padding: '10px 12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px',
                            transition: 'border-color 0.2s ease'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Address *</label>
                        <input
                          type="text"
                          placeholder="Enter address"
                          value={visitorForm.address}
                          onChange={(e) => setVisitorForm({ ...visitorForm, address: e.target.value })}
                          required
                          style={{
                            width: '90%',
                            padding: '10px 12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px',
                            transition: 'border-color 0.2s ease'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Documentation & Contact Section */}
                  <div style={{ 
                    background: '#f8fafc', 
                    padding: '20px', 
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h4 style={{ 
                      margin: '0 0 20px 0', 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#374151',
                      borderBottom: '2px solid #4b5563',
                      paddingBottom: '8px'
                    }}>
                      Documentation & Contact
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Valid ID *</label>
                        <input
                          type="text"
                          placeholder="Enter valid ID number"
                          value={visitorForm.valid_id}
                          onChange={(e) => setVisitorForm({ ...visitorForm, valid_id: e.target.value })}
                          required
                          style={{
                            width: '90%',
                            padding: '10px 12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px',
                            transition: 'border-color 0.2s ease'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Date of Application *</label>
                        <input
                          type="date"
                          value={visitorForm.date_of_application}
                          max={getTodayDate()}
                          onChange={(e) => setVisitorForm({ ...visitorForm, date_of_application: e.target.value })}
                          required
                          style={{
                            width: '90%',
                            padding: '10px 12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px',
                            background: '#fff',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s ease'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Contact Number</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontSize: '14px' }}>
                            <input
                              type="checkbox"
                              checked={!!visitorForm.has_contact_number}
                              onChange={(e) => setVisitorForm({ ...visitorForm, has_contact_number: e.target.checked })}
                              style={{ margin: 0 }}
                            />
                            Visitor has contact number
                          </label>
                        </div>
                        <input
                          type="text"
                          placeholder="Enter contact number (09xxxxxxxxx)"
                          value={visitorForm.contact_number}
                          onChange={(e) => setVisitorForm({ ...visitorForm, contact_number: normalizeContactNumber(e.target.value) })}
                          inputMode="numeric"
                          maxLength={11}
                          title="Contact number must be 11 digits and start with 09"
                          disabled={!visitorForm.has_contact_number}
                          required={!!visitorForm.has_contact_number}
                          style={{
                            width: '90%',
                            padding: '10px 12px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '6px',
                            fontSize: '14px',
                            transition: 'border-color 0.2s ease',
                            opacity: visitorForm.has_contact_number ? 1 : 0.5
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visit Type Section */}
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '20px', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '24px'
                }}>
                  <h4 style={{ 
                    margin: '0 0 20px 0', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '2px solid #4b5563',
                    paddingBottom: '8px'
                  }}>
                    Visit Type
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      <input
                        type="checkbox"
                        checked={visitorForm.verified_conjugal}
                        onChange={(e) => setVisitorForm({ ...visitorForm, verified_conjugal: e.target.checked })}
                        style={{ margin: 0, width: '16px', height: '16px' }}
                      />
                      Verified for conjugal visit
                    </label>
                  </div>
                </div>

              </form>
            </div>
          </AppModal>
        )}

        {showIdPreview && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ textAlign: 'center' }}>ID Preview</h3>
            <div id="id-preview-container" ref={idPreviewRef} style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {selectedVisitors.map(visitor => (
                  <div key={visitor.id} className="id-card" style={{ width: 408 * 1.5 + 'px', height: 324 * 1.5 + 'px', position: 'relative', backgroundColor: 'transparent', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    {/* Background image layer covering entire card */}
                    <div className="id-card-background" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', padding: 0, overflow: 'hidden', width: '100%', height: '100%' }}>
                      <img src={ID_Background} alt="ID Background Left" className="left" style={{ width: '50%', height: '100%', objectFit: 'cover', flexShrink: 0, borderRadius: '8px 0 0 8px' }} />
                      <img src={ID_Background} alt="ID Background Right" className="right" style={{ width: '50%', height: '100%', objectFit: 'cover', flexShrink: 0, borderRadius: '0 8px 8px 0' }} />
                    </div>
                    {/* Left side - Visitor info */}
                    <div style={{ width: 204 * 1.5 + 'px', height: 324 * 1.5 + 'px', position: 'relative', backgroundColor: 'transparent', flexDirection: 'column', justifyContent: 'space-between', display: 'flex', zIndex: 1 }}>
                      <div className="id-card-side left" style={{ position: 'relative', padding: '10px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', width: '100%', flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', marginBottom: '5px' }}>Silang Municipal Jail</div>
                        <div className="id-card-logos" style={{ display: 'flex', justifyContent: 'center', padding: 0, gap: '5px', width: '100%' }}>
                          <img src="/logo1.png" alt="Logo 1" style={{ margin: 0, width: '65px', height: '65px', objectFit: 'contain' }} />
                          <img src="/logo2.png" alt="Logo 2" style={{ margin: 0, width: '65px', height: '65px', objectFit: 'contain' }} />
                          <img src="/logo3.png" alt="Logo 3" style={{ margin: 0, width: '66px', height: '66px', objectFit: 'contain' }} />
                        </div>
                        <div className="id-card-title" style={{ fontWeight: 'bold', marginTop: '5px', marginBottom: '10px', fontSize: '1rem', textAlign: 'center' }}>Visitator's Identification Card</div>
                        <div className="id-card-photo-placeholder" style={{ width: '180px', height: '180px', backgroundColor: '#ccc', margin: '10px auto', display: 'block', flexShrink: 0, textAlign: 'center', lineHeight: '180px', fontWeight: 'bold', color: '#666', position: 'relative' }}>
                          {capturedPhotos[visitor.id] ? (
                            <img src={capturedPhotos[visitor.id]} alt={visitor.name} style={{ width: '180px', height: '180px', objectFit: 'cover', borderRadius: '4px' }} />
                          ) : (
                            '2x2 Photo'
                          )}
                          <button
                            type="button"
                            className={`id-photo-btn ${capturedPhotos[visitor.id] ? 'has-photo' : ''}`}
                            title={capturedPhotos[visitor.id] ? `Retake photo — ${visitor.name}` : `Add photo — ${visitor.name}`}
                            aria-label={capturedPhotos[visitor.id] ? `Retake photo for ${visitor.name}` : `Add photo for ${visitor.name}`}
                            onClick={(e) => { e.stopPropagation(); openCameraForVisitor(visitor.id); }}
                          >
                            <svg viewBox="0 0 24 24">
                              <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
                            </svg>
                          </button>
                        </div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '5px' }}>Visitor</div>
                        <div className="id-card-info" style={{ fontSize: '0.9rem', marginTop: '5px', textAlign: 'center' }}>
                          <div><strong>ID: {visitor.visitor_id}</strong></div>
                          <div><strong>{visitor.name}</strong></div>
                          <div className="address">{visitor.address}</div>
                          <div>{visitor.relationship}</div>
                        </div>
                      </div>
                      <div className="id-card-side right" style={{ position: 'relative', padding: '10px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', width: '100%', flex: 1, marginTop: '10px' }}>
                        <div className="id-card-info" style={{ fontSize: '0.9rem', marginTop: '5px', textAlign: 'center' }}>
                        </div>
                        <div className="id-card-qr" style={{ backgroundColor: 'transparent', padding: '5px', objectFit: 'fill', position: 'relative', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        </div>
                        {/* Removed Contact No. from first side as requested */}
                      </div>
                    </div>
                    {/* Right side - Duplicate design with PDL info */}
                    <div style={{ width: 204 * 1.5 + 'px', height: 324 * 1.5 + 'px', position: 'relative', backgroundColor: 'transparent', flexDirection: 'column', justifyContent: 'space-between', display: 'flex', borderLeft: '1px solid #ccc', padding: '10px', boxSizing: 'border-box', zIndex: 1 }}>
                      <div className="id-card-title" style={{ fontWeight: 'bold', marginTop: '5px', marginBottom: '10px', fontSize: '1rem', textAlign: 'center' }}>PDL to be Visit</div>
                      <div className="id-card-info" style={{ fontSize: '0.9rem', marginTop: '5px', textAlign: 'center' }}>
                        <div><strong>Name:</strong> {pdl ? `${pdl.first_name} ${pdl.last_name}` : ''}</div>
                        <div><strong>Cell No:</strong> {pdl ? pdl.cell_number : ''}</div>
                      </div>
                      <div className="id-card-qr" style={{ backgroundColor: 'transparent', padding: '5px', objectFit: 'fill', position: 'relative', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <QRCodeCanvas
                          value={`visitor_id:${visitor.visitor_id}`}
                          size={200}
                        />
                      </div>
                      <div className="id-card-contact" style={{ fontSize: '0.9rem', marginTop: '10px', textAlign: 'center' }}>
                        <strong>Contact No.</strong><br />
                        {visitor.contact_number}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            <div className="id-preview-buttons">
              <button className="common-button delete" onClick={handleCloseIdPreview}>
                <svg className="button-icon" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
                Close Preview
              </button>
              <button className="common-button" onClick={handlePrintSelected}>
                <svg className="button-icon" viewBox="0 0 24 24">
                  <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                </svg>
                Print Selected IDs
              </button>
              <button className="common-button save" onClick={handleSaveIds}>
                <svg className="button-icon" viewBox="0 0 24 24">
                  <path d="M17 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V7L17 3M19 19H5V5H16.17L19 7.83V19M12 12C10.34 12 9 13.34 9 15S10.34 18 12 18 15 16.66 15 15 13.66 12 12 12M6 6H15V10H6V6Z"/>
                </svg>
                Save ID
              </button>
            </div>
          </div>
        )}

        {/* Camera Modal */}
        {showCameraModal && (
          <AppModal
            open={showCameraModal}
            onClose={closeCameraModal}
            title={`Capture Photo${cameraVisitorName ? ` — ${cameraVisitorName}` : ''}`}
            subtitle="Position the visitor facing the camera"
            tone="slate"
            titleColor="#111827"
            titleIcon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            }
            maxContentWidth={400}
            actions={
              <>
                <button className="btn btn-secondary" onClick={closeCameraModal}>Cancel</button>
                <button className="btn btn-primary" onClick={capturePhoto}>Capture</button>
              </>
            }
          >
            <div style={{ textAlign: 'center' }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '8px' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          </AppModal>
        )}
      </main>
    </div>
  );
};

export default VisitorPage;
