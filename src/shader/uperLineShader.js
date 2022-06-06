export const uperVertext = `
varying vec3 vPosition;
void main()
{
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1 );
}
`;
export const uperFragment = `
varying vec3 vPosition;
  uniform float height;
  uniform vec4 uFlowColor;
  uniform vec4 uModelColor;
void main()
{
  //模型的基础颜色
 vec4 distColor=uModelColor;
// 流动范围当前点z的高度加上流动线的高度
 float topY = vPosition.y +0.02;
if (height > vPosition.y && height < topY) {
 // 颜色渐变 
  distColor = uFlowColor; 
}
//  gl_FragColor = distColor;
 gl_FragColor = distColor;
}`;
