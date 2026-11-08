/** The privacy policy lives on Croma's TransMilenio site; this old address keeps working. */
export function GET() {
  return Response.redirect("https://transmi.usecroma.com/paradero/privacidad", 308);
}
