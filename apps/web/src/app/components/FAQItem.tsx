'use client';

import { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import styles from './FAQItem.module.css';

interface FAQItemProps {
  question: string;
  answer: string;
}

export default function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleOpen();
    }
  };

  return (
    <div className={styles.faqItem}>
      <dt>
        <button
          type="button"
          className={styles.faqQuestion}
          onClick={toggleOpen}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
        >
          <HelpCircle aria-hidden="true" size={20} className={styles.icon} />
          <span className={styles.questionText}>{question}</span>
          <ChevronDown
            aria-hidden="true"
            size={20}
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          />
        </button>
      </dt>
      <dd className={`${styles.faqAnswer} ${isOpen ? styles.faqAnswerOpen : ''}`}>{answer}</dd>
    </div>
  );
}
