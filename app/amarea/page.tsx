import { permanentRedirect } from "next/navigation";

// La tienda AMAREA ahora vive en la raíz (/). Esta ruta redirige de forma
// permanente (308) para no duplicar contenido y conservar los enlaces viejos.
export default function AmareaIndex() {
  permanentRedirect("/");
}
