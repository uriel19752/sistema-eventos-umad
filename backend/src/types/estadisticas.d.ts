export interface FiltrosEstadisticas {
    plantel?: string;
    institucion?: string;
    fechaInicio?: string;
    fechaFin?: string;
}
export interface EstadisticasPorEntidad {
    nombre: string;
    total: number;
}
export interface EstadisticasPorMes {
    mes: string;
    total: number;
}
export interface TendenciasMensuales {
    totalSolicitudes: number;
    pendientes: number;
    aprobadas: number;
    completadas: number;
    canceladas: number;
}
export interface EntidadLider {
    nombre: string;
    porcentaje: number;
}
export interface MesMasActivo {
    nombre: string;
    total: number;
}
export interface TendenciaGeneral {
    porcentaje: number;
    tipo: "crecimiento" | "decrecimiento" | "estable";
}
export interface InsightsData {
    plantelLider: EntidadLider;
    institucionLider: EntidadLider;
    mesMasActivo: MesMasActivo;
    tasaCancelacion: number;
    tendenciaGeneral: TendenciaGeneral;
}
export interface PromediosEncuesta {
    puntualidad: number;
    calidadTecnica: number;
    atencionStaff: number;
    satisfaccionGral: number;
    totalEncuestas: number;
}
export interface DiagnosticoCSAT {
    nivel: string;
    mensaje: string;
    color: string;
}
export interface VariacionCSAT {
    actual: number;
    anterior: number;
    diferencia: number;
}
export interface DistribucionEstrella {
    estrellas: number;
    total: number;
}
export interface EstadisticasPorMaterial {
    tipo: string;
    total: number;
}
export interface DashboardEstadisticas {
    totalSolicitudes: number;
    pendientes: number;
    aprobadas: number;
    completadas: number;
    canceladas: number;
    porPlantel: EstadisticasPorEntidad[];
    porInstitucion: EstadisticasPorEntidad[];
    porMaterial: EstadisticasPorMaterial[];
    porMes: EstadisticasPorMes[];
    tendencias: TendenciasMensuales;
    insights: InsightsData;
    promediosEncuesta: PromediosEncuesta;
    diagnostico: DiagnosticoCSAT;
    variacionCSAT: VariacionCSAT;
    distribucionEstrellas: DistribucionEstrella[];
}
//# sourceMappingURL=estadisticas.d.ts.map