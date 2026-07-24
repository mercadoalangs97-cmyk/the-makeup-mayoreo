import sharp from "sharp";
const P="D:/THE MAKEUP MAYOREO/AMAREA PRODUCTOS/fotos-lotes/WhatsApp Image 2026-07-20 at 4.50.45 PM.jpeg";
const meta = await sharp(P).metadata();
console.log("original:", meta.width+"x"+meta.height);
// Recorte 1: quita la barra inferior (campo+boton+badges+letra chica ~ bottom 34%)
const h1 = Math.round(meta.height*0.66);
await sharp(P).extract({left:0,top:0,width:meta.width,height:h1}).jpeg({quality:88}).toFile("scratch_crop_a.jpg");
console.log("recorte A (top 66%):", meta.width+"x"+h1);
