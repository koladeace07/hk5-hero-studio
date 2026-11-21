import React from 'react';
import { Trash2, Edit3, Download, FolderHeart } from 'lucide-react';
import { SavedDesign } from '../types/watchface';

interface SavedGalleryProps {
  designs: SavedDesign[];
  onLoad: (design: SavedDesign) => void;
  onDelete: (id: string) => void;
  onDownload: (design: SavedDesign) => void;
}

export const SavedGallery: React.FC<SavedGalleryProps> = ({
  designs,
  onLoad,
  onDelete,
  onDownload
}) => {
  if (designs.length === 0) {
    return (
      <div className="empty-state">
        <FolderHeart size={42} />
        <h3>Aún no tienes esferas guardadas</h3>
        <p>
          Crea tu diseño en el <strong>Diseñador</strong> y presiona <strong>Guardar</strong> para
          armar tu colección personal para el HK5 HERO.
        </p>
      </div>
    );
  }

  return (
    <div className="gallery-grid">
      {designs.map((design) => (
        <div key={design.id} className="gallery-card">
          <div className="gallery-thumb-wrap">
            <img src={design.thumbnail} alt={design.config.name} className="gallery-thumb" />
          </div>
          <div className="gallery-info">
            <h4>{design.config.name || 'Sin nombre'}</h4>
            <span>{new Date(design.createdAt).toLocaleDateString('es-ES')}</span>
          </div>
          <div className="gallery-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onLoad(design)}>
              <Edit3 size={14} />
              <span>Editar</span>
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onDownload(design)}>
              <Download size={14} />
              <span>PNG</span>
            </button>
            <button
              type="button"
              className="btn btn-danger-ghost btn-sm"
              onClick={() => onDelete(design.id)}
              aria-label="Eliminar esfera"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
