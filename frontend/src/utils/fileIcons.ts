import {
  Description as WordIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Slideshow as PowerpointIcon,
  TableChart as ExcelIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';

export const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'doc':
    case 'docx':
      return WordIcon;
    case 'pdf':
      return PdfIcon;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return ImageIcon;
    case 'ppt':
    case 'pptx':
      return PowerpointIcon;
    case 'xls':
    case 'xlsx':
      return ExcelIcon;
    default:
      return FileIcon;
  }
};