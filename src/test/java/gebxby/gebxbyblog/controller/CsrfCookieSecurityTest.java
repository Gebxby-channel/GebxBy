package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.config.SecurityConfig;
import gebxby.gebxbyblog.config.CrossSiteCookieFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.allOf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SecurityController.class)
@AutoConfigureMockMvc
@Import({SecurityConfig.class, CrossSiteCookieFilter.class})
class CsrfCookieSecurityTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void csrfEndpointIssuesCrossSiteCookieForSpaMutations() throws Exception {
        mockMvc.perform(get("/api/csrf").secure(true))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("XSRF-TOKEN="),
                        containsString("Path=/"),
                        containsString("Secure"),
                        containsString("SameSite=None")
                )));
    }
}
