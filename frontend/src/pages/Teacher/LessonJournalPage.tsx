import React from 'react';
import { Container } from '@mui/material';
import LessonJournal from '../../components/Teacher/LessonJournal';

const LessonJournalPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 }, minHeight: '100vh' }}>
      <LessonJournal />
    </Container>
  );
};

export default LessonJournalPage;