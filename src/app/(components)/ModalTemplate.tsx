import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';

type ModalTemplateProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const backdropVariants = {
	visible: { opacity: 1 },
	hidden: { opacity: 0 },
};

const modalVariants = {
	hidden: { y: 50, opacity: 0 },
	visible: { y: 0, opacity: 1, transition: { delay: 0.2 } },
};

export const ModalTemplate = ({ isOpen, onClose, children }: ModalTemplateProps) => {
	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className="fixed inset-0 bg-neutral-700 bg-opacity-60 z-50 flex justify-center items-center"
					variants={backdropVariants}
					initial="hidden"
					animate="visible"
					exit="hidden"
					onClick={onClose}
				>
					<motion.div
						className="max-w-2xl w-full bg-primary p-6 rounded-lg max-h-[80%] relative overflow-y-auto"
						variants={modalVariants}
						initial="hidden"
						animate="visible"
						exit="hidden"
						onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to the backdrop
					>
						<button className='absolute top-4 right-4 text-black z-50' onClick={onClose}>
							<XMarkIcon className='w-8 h-8 text-white'/>
						</button>
						{children}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
