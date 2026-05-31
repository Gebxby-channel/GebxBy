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
        String textColor,
        String accentColor
) {
}
