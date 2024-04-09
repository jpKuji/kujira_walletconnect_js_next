type Props = {
	width: string;
	height: string;
	color?: string;
}

const LoadingSpinner = (props: Props) => {
	return (
		<div className="flex justify-center items-center w-full">
			<div
				className={`${props.width} ${props.height} border-4 ${props.color ? props.color : 'border-highlight'} border-dashed rounded-full animate-spin`}
				style={{
					borderTopColor: 'transparent'
				}}
			></div>
		</div>
	);
};
  
export default LoadingSpinner;