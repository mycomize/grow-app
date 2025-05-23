import React from 'react';
import Svg, { Path, Circle, Ellipse, SvgProps } from 'react-native-svg';

interface MushroomIconProps extends SvgProps {
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

const MushroomIcon: React.FC<MushroomIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000',
  strokeWidth = 2,
  ...props
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" {...props}>
      {/* Mushroom cap outline */}
      <Path
        d="M12 2C7 2 3 6 3 11C3 12 3.5 13 4.5 13H19.5C20.5 13 21 12 21 11C21 6 17 2 12 2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Mushroom stem outline */}
      <Path
        d="M9 13H15V20C15 21 14 22 13 22H11C10 22 9 21 9 20V13Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

export default MushroomIcon;
