import React, { useEffect, useState } from "react";

import {
  Animated,
  Image,
  StyleSheet,
  PanResponder,
  View,
  Easing,
  ViewPropTypes,
  I18nManager,
} from "react-native";

import PropTypes from "prop-types";

const TRACK_SIZE = 4;
const THUMB_SIZE = 20;

function Rect(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
}

Rect.prototype.containsPoint = function (x, y) {
  return (
    x >= this.x &&
    y >= this.y &&
    x <= this.x + this.width &&
    y <= this.y + this.height
  );
};

const DEFAULT_ANIMATION_CONFIGS = {
  spring: {
    friction: 7,
    tension: 100,
  },
  timing: {
    duration: 150,
    easing: Easing.inOut(Easing.ease),
    delay: 0,
  },
  // decay : { // This has a serious bug
  //   velocity     : 1,
  //   deceleration : 0.997
  // }
};

const Slider = ({
  value,
  animateTransitions,
  disabled,
  maximumValue,
  minimumValue,
  step,
  animationType,
  animationConfig,
  debugTouchArea,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
  thumbImage,
  styles,
  style,
  trackStyle,
  thumbStyle,
  onValueChange,
  thumbTouchSize,
  ...other
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [trackSize, setTrackSize] = useState({ width: 0, height: 0 });
  const [thumbSize, setThumbSize] = useState({ width: 0, height: 0 });
  const [allMeasured, setAllMeasured] = useState(false);
  const [value, setValue] = useState(new Animated.Value(value));

  useEffect(() => {
    let _panResponder = PanResponder.create({
      onStartShouldSetPanResponder: _handleStartShouldSetPanResponder,
      onMoveShouldSetPanResponder: _handleMoveShouldSetPanResponder,
      onPanResponderGrant: _handlePanResponderGrant,
      onPanResponderMove: _handlePanResponderMove,
      onPanResponderRelease: _handlePanResponderEnd,
      onPanResponderTerminationRequest: _handlePanResponderRequestEnd,
      onPanResponderTerminate: _handlePanResponderEnd,
    });
  }, []);

  useEffect(() => {
    if (value) {
      if (animateTransitions) {
        _setCurrentValueAnimated(newValue);
      } else {
        _setCurrentValue(newValue);
      }
    }
  }, [value]);

  const _getPropsForComponentUpdate = (props) => {
    const {
      value,
      onValueChange,
      onSlidingStart,
      onSlidingComplete,
      style,
      trackStyle,
      thumbStyle,
      ...otherProps
    } = props;

    return otherProps;
  };

  const _handleStartShouldSetPanResponder = (e /* gestureState: Object */) =>
    // Should we become active when the user presses down on the thumb?
    _thumbHitTest(e);

  const _handleMoveShouldSetPanResponder =
    (/* e: Object, gestureState: Object */) => {
      // Should we become active when the user moves a touch over the thumb?
      return false;
    };

  const _handlePanResponderGrant = (/* e: Object, gestureState: Object */) => {
    _previousLeft = _getThumbLeft(_getCurrentValue());
    _fireChangeEvent("onSlidingStart");
  };

  const _handlePanResponderMove = (e, gestureState) => {
    if (disabled) {
      return;
    }

    _setCurrentValue(_getValue(gestureState));
    _fireChangeEvent("onValueChange");
  };

  const _handlePanResponderRequestEnd = (e, gestureState) => {
    // Should we allow another component to take over this pan?
    return false;
  };

  const _handlePanResponderEnd = (e, gestureState) => {
    if (disabled) {
      return;
    }

    _setCurrentValue(_getValue(gestureState));
    _fireChangeEvent("onSlidingComplete");
  };

  const _measureContainer = (x) => {
    _handleMeasure("containerSize", x);
  };

  const _measureTrack = (x) => {
    _handleMeasure("trackSize", x);
  };

  const _measureThumb = (x) => {
    _handleMeasure("thumbSize", x);
  };

  const _handleMeasure = (name, x) => {
    const { width, height } = x.nativeEvent.layout;
    const size = { width, height };

    const storeName = `_${name}`;
    const currentSize = this[storeName];
    if (
      currentSize &&
      width === currentSize.width &&
      height === currentSize.height
    ) {
      return;
    }
    this[storeName] = size;

    if (_containerSize && _trackSize && _thumbSize) {
      setContainerSize(_containerSize);
      setTrackSize(_trackSize);
      setThumbSize(_thumbSize);
      setAllMeasured(true);
    }
  };

  _getRatio = (value) => (value - minimumValue) / (maximumValue - minimumValue);

  _getThumbLeft = (value) => {
    const nonRtlRatio = _getRatio(value);
    const ratio = I18nManager.isRTL ? 1 - nonRtlRatio : nonRtlRatio;
    return ratio * (containerSize.width - thumbSize.width);
  };

  _getValue = (gestureState) => {
    const length = containerSize.width - thumbSize.width;
    const thumbLeft = _previousLeft + gestureState.dx;

    const nonRtlRatio = thumbLeft / length;
    const ratio = I18nManager.isRTL ? 1 - nonRtlRatio : nonRtlRatio;

    if (step) {
      return Math.max(
        minimumValue,
        Math.min(
          maximumValue,
          minimumValue +
            Math.round((ratio * (maximumValue - minimumValue)) / step) * step
        )
      );
    }
    return Math.max(
      minimumValue,
      Math.min(
        maximumValue,
        ratio * (maximumValue - minimumValue) + minimumValue
      )
    );
  };

  const _getCurrentValue = () => value.__getValue();

  const _setCurrentValue = (value) => {
    value.setValue(value);
  };

  const _setCurrentValueAnimated = (value) => {
    const animationType = animationType;
    const animationConfig = Object.assign(
      {},
      DEFAULT_ANIMATION_CONFIGS[animationType],
      animationConfig,
      {
        toValue: value,
      }
    );

    Animated[animationType](value, animationConfig).start();
  };

  _fireChangeEvent = (event) => {
    if ([event]) {
      [event](_getCurrentValue());
    }
  };

  _getTouchOverflowSize = () => {
    const size = {};
    if (allMeasured === true) {
      size.width = Math.max(0, thumbTouchSize.width - thumbSize.width);
      size.height = Math.max(0, thumbTouchSize.height - containerSize.height);
    }

    return size;
  };

  const _getTouchOverflowStyle = () => {
    const { width, height } = _getTouchOverflowSize();

    const touchOverflowStyle = {};
    if (width !== undefined && height !== undefined) {
      const verticalMargin = -height / 2;
      touchOverflowStyle.marginTop = verticalMargin;
      touchOverflowStyle.marginBottom = verticalMargin;

      const horizontalMargin = -width / 2;
      touchOverflowStyle.marginLeft = horizontalMargin;
      touchOverflowStyle.marginRight = horizontalMargin;
    }

    if (debugTouchArea === true) {
      touchOverflowStyle.backgroundColor = "orange";
      touchOverflowStyle.opacity = 0.5;
    }

    return touchOverflowStyle;
  };

  const _thumbHitTest = (e) => {
    const nativeEvent = e.nativeEvent;
    const thumbTouchRect = _getThumbTouchRect();
    return thumbTouchRect.containsPoint(
      nativeEvent.locationX,
      nativeEvent.locationY
    );
  };

  const _getThumbTouchRect = () => {
    const touchOverflowSize = _getTouchOverflowSize();

    return new Rect(
      touchOverflowSize.width / 2 +
        _getThumbLeft(_getCurrentValue()) +
        (state.thumbSize.width - props.thumbTouchSize.width) / 2,
      touchOverflowSize.height / 2 +
        (state.containerSize.height - props.thumbTouchSize.height) / 2,
      props.thumbTouchSize.width,
      props.thumbTouchSize.height
    );
  };

  const _renderDebugThumbTouchRect = (thumbLeft) => {
    const thumbTouchRect = _getThumbTouchRect();
    const positionStyle = {
      left: thumbLeft,
      top: thumbTouchRect.y,
      width: thumbTouchRect.width,
      height: thumbTouchRect.height,
    };

    return (
      <Animated.View
        style={[defaultStyles.debugThumbTouchArea, positionStyle]}
        pointerEvents="none"
      />
    );
  };

  const _renderThumbImage = () => {
    if (!thumbImage) return;

    return <Image source={thumbImage} />;
  };

  const mainStyles = styles || defaultStyles;
  const thumbLeft = value.interpolate({
    inputRange: [minimumValue, maximumValue],
    outputRange: I18nManager.isRTL
      ? [0, -(containerSize.width - thumbSize.width)]
      : [0, containerSize.width - thumbSize.width],
    // extrapolate: 'clamp',
  });
  const minimumTrackWidth = value.interpolate({
    inputRange: [minimumValue, maximumValue],
    outputRange: [0, containerSize.width - thumbSize.width],
    // extrapolate: 'clamp',
  });
  const valueVisibleStyle = {};
  if (!allMeasured) {
    valueVisibleStyle.opacity = 0;
  }

  const minimumTrackStyle = {
    position: "absolute",
    width: Animated.add(minimumTrackWidth, thumbSize.width / 2),
    backgroundColor: minimumTrackTintColor,
    ...valueVisibleStyle,
  };

  const touchOverflowStyle = _getTouchOverflowStyle();

  return (
    <View
      {...other}
      style={[mainStyles.container, style]}
      onLayout={_measureContainer}
    >
      <View
        style={[
          { backgroundColor: maximumTrackTintColor },
          mainStyles.track,
          trackStyle,
        ]}
        renderToHardwareTextureAndroid
        onLayout={_measureTrack}
      />
      <Animated.View
        renderToHardwareTextureAndroid
        style={[mainStyles.track, trackStyle, minimumTrackStyle]}
      />
      <Animated.View
        onLayout={_measureThumb}
        renderToHardwareTextureAndroid
        style={[
          { backgroundColor: thumbTintColor },
          mainStyles.thumb,
          thumbStyle,
          {
            transform: [{ translateX: thumbLeft }, { translateY: 0 }],
            ...valueVisibleStyle,
          },
        ]}
      >
        {_renderThumbImage()}
      </Animated.View>
      <View
        renderToHardwareTextureAndroid
        style={[defaultStyles.touchArea, touchOverflowStyle]}
        {..._panResponder.panHandlers}
      >
        {debugTouchArea === true &&
          _renderDebugThumbTouchRect(minimumTrackWidth)}
      </View>
    </View>
  );
};

export default Slider;

Slider.propTypes = {
  /**
   * Initial value of the slider. The value should be between minimumValue
   * and maximumValue, which default to 0 and 1 respectively.
   * Default value is 0.
   *
   * *This is not a controlled component*, e.g. if you don't update
   * the value, the component won't be reset to its inital value.
   */
  value: PropTypes.number,

  /**
   * If true the user won't be able to move the slider.
   * Default value is false.
   */
  disabled: PropTypes.bool,

  /**
   * Initial minimum value of the slider. Default value is 0.
   */
  minimumValue: PropTypes.number,

  /**
   * Initial maximum value of the slider. Default value is 1.
   */
  maximumValue: PropTypes.number,

  /**
   * Step value of the slider. The value should be between 0 and
   * (maximumValue - minimumValue). Default value is 0.
   */
  step: PropTypes.number,

  /**
   * The color used for the track to the left of the button. Overrides the
   * default blue gradient image.
   */
  minimumTrackTintColor: PropTypes.string,

  /**
   * The color used for the track to the right of the button. Overrides the
   * default blue gradient image.
   */
  maximumTrackTintColor: PropTypes.string,

  /**
   * The color used for the thumb.
   */
  thumbTintColor: PropTypes.string,

  /**
   * The size of the touch area that allows moving the thumb.
   * The touch area has the same center has the visible thumb.
   * This allows to have a visually small thumb while still allowing the user
   * to move it easily.
   * The default is {width: 40, height: 40}.
   */
  thumbTouchSize: PropTypes.shape({
    width: PropTypes.number,
    height: PropTypes.number,
  }),

  /**
   * Callback continuously called while the user is dragging the slider.
   */
  onValueChange: PropTypes.func,

  /**
   * Callback called when the user starts changing the value (e.g. when
   * the slider is pressed).
   */
  onSlidingStart: PropTypes.func,

  /**
   * Callback called when the user finishes changing the value (e.g. when
   * the slider is released).
   */
  onSlidingComplete: PropTypes.func,

  /**
   * The style applied to the slider container.
   */
  style: ViewPropTypes.style,

  /**
   * The style applied to the track.
   */
  trackStyle: ViewPropTypes.style,

  /**
   * The style applied to the thumb.
   */
  thumbStyle: ViewPropTypes.style,

  /**
   * Sets an image for the thumb.
   */
  thumbImage: Image.propTypes.source,

  /**
   * Set this to true to visually see the thumb touch rect in green.
   */
  debugTouchArea: PropTypes.bool,

  /**
   * Set to true to animate values with default 'timing' animation type
   */
  animateTransitions: PropTypes.bool,

  /**
   * Custom Animation type. 'spring' or 'timing'.
   */
  animationType: PropTypes.oneOf(["spring", "timing"]),

  /**
   * Used to configure the animation parameters.  These are the same parameters in the Animated library.
   */
  animationConfig: PropTypes.object,
};

Slider.defaultProps = {
  value: 0,
  minimumValue: 0,
  maximumValue: 1,
  step: 0,
  minimumTrackTintColor: "#3f3f3f",
  maximumTrackTintColor: "#b3b3b3",
  thumbTintColor: "#343434",
  thumbTouchSize: { width: 40, height: 40 },
  debugTouchArea: false,
  animationType: "timing",
};

var defaultStyles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: "center",
  },
  track: {
    height: TRACK_SIZE,
    borderRadius: TRACK_SIZE / 2,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
  touchArea: {
    position: "absolute",
    backgroundColor: "transparent",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  debugThumbTouchArea: {
    position: "absolute",
    backgroundColor: "green",
    opacity: 0.5,
  },
});
