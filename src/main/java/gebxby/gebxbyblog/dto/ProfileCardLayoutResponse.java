package gebxby.gebxbyblog.dto;

public record ProfileCardLayoutResponse(
        double photoX,
        double photoY,
        double photoW,
        double photoH,
        double nameX,
        double nameY,
        double nameW,
        double nameH,
        double designationX,
        double designationY,
        double designationW,
        double designationH,
        double statsX,
        double statsY,
        double statsW,
        double statsH,
        double nameFontSize,
        double designationFontSize,
        double statsFontSize,
        String textColor,
        String accentColor
) {
    public ProfileCardLayoutResponse(double photoX,
                                     double photoY,
                                     double photoW,
                                     double photoH,
                                     double nameX,
                                     double nameY,
                                     double nameW,
                                     double nameH,
                                     double designationX,
                                     double designationY,
                                     double designationW,
                                     double designationH,
                                     double statsX,
                                     double statsY,
                                     double statsW,
                                     double statsH,
                                     String textColor,
                                     String accentColor) {
        this(photoX, photoY, photoW, photoH, nameX, nameY, nameW, nameH,
                designationX, designationY, designationW, designationH,
                statsX, statsY, statsW, statsH, 3.0, 1.5, 1.2, textColor, accentColor);
    }
}
